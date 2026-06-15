import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import type { OpenClawPluginApi } from "openclaw/plugin-sdk/plugin-entry";
import { Type } from "typebox";
import {
  DreamingConfigSchema,
  type DreamingConfig,
} from "./config.js";
import { resolveDreamingConfig, summarizeDreamingConfig } from "./config-resolve.js";
import { summarizePluginEntryPolicy, warnIfCronHookBlocked, warnIfModelOverrideBlocked } from "./hook-policy.js";
import {
  RUNTIME_CRON_RECONCILE_INTERVAL_MS,
  STARTUP_CRON_RETRY_DELAY_MS,
  STARTUP_CRON_MAX_RETRIES,
  DAILY_REPORT_TRIGGER_TOKEN,
  DREAMING_TRIGGER_TOKEN,
  PLUGIN_VERSION,
} from "./constants.js";
import {
  reconcileManagedDreamingCron,
  resolveCronServiceFromCandidate,
  resolveEffectiveDailyReportCronExpr,
  type CronService,
} from "./cron.js";
import {
  createDreamingDb,
  getCachedLancedbConfig,
  getResolvedLanceDbPluginId,
  initLancedbConfigCache,
} from "./lancedb-client.js";
import { runDreamingPipeline, type DreamingRunResult } from "./pipeline.js";
import {
  endPipeline,
  resetPipelineForShutdown,
  tryBeginPipeline,
} from "./pipeline-lock.js";
import { readDreamingRunMetadata, recordDreamingRun } from "./run-metadata.js";
import {
  isLlmCompleteAvailable,
  isSubagentRuntimeAvailable,
  resolveDreamingLlmRuntime,
} from "./subagent-runtime.js";
import {
  buildSnapshotFromPipeline,
  deliverDailyReportMessage,
  evaluateDailyReportDelivery,
  extractLatestNarrativeExcerpt,
  publishDailyReport,
  resolveReportDay,
  writeDailyReportDeliveryState,
  writeDailyReportSnapshot,
} from "./daily-report/index.js";
import type { DailyReportPublishResult } from "./daily-report/types.js";
import type { DailyReportDeliverySkipReason } from "./daily-report/delivery-policy.js";
import { includesSystemEventToken } from "./utils.js";
import {
  readDefaultWorkspaceFromDisk,
  resolveWorkspaceDir,
} from "./workspace-path.js";

function logDebug(api: OpenClawPluginApi, message: string): void {
  if (typeof api.logger.debug === "function") {
    api.logger.debug(message);
  }
}

export default definePluginEntry({
  id: "memory-lancedb-dreaming",
  name: "Dreaming (LanceDB)",
  description:
    "Light/REM/Deep sleep dreaming for memory-lancedb. Auto-manages cron, reads LanceDB vector memory, generates narrative dream diary entries, promotes memories, and publishes optional daily reports.",
  configSchema: DreamingConfigSchema as never,

  register(api) {
    try {
      const rawConfig = api.pluginConfig as Partial<DreamingConfig> | undefined;
      let config = resolveDreamingConfig(rawConfig, api);

      initLancedbConfigCache(api);

      const cachedWorkspace =
        api.config.agents?.defaults?.workspace?.trim() ||
        readDefaultWorkspaceFromDisk() ||
        null;

      let startupCron: CronService | null = null;
      let cronRetryTimer: ReturnType<typeof setInterval> | null = null;
      let cronRetryAttempts = 0;
      let unavailableCronDebugEmitted = false;
      let lastRuntimeReconcileAtMs = 0;
      let lastRuntimeConfigKey: string | null = null;
      let lastRuntimeCronRef: CronService | null = null;

      const runtimeConfigKey = (value: DreamingConfig) =>
        [
          value.enabled ? "enabled" : "disabled",
          value.cron,
          value.timezone,
          String(value.deep.maxPromotions ?? value.deep.limit ?? 5),
          String(value.deep.minScore),
          value.autoManageCron ? "auto-cron" : "manual-cron",
          value.dailyReport.enabled ? "daily-on" : "daily-off",
          value.dailyReport.cron,
          JSON.stringify(value.dailyReport.delivery ?? null),
        ].join("|");

      const resolveWorkspace = (ctxWorkspace?: string) =>
        resolveWorkspaceDir(api, ctxWorkspace, cachedWorkspace);

      const finalizeDailyReportFromPipeline = async (params: {
        workspaceDir: string;
        config: DreamingConfig;
        result: DreamingRunResult;
        phase?: string;
        nowMs?: number;
      }) => {
        if (!params.config.dailyReport.enabled) return null;
        const phase = params.phase ?? "all";
        if (phase !== "all") return null;

        const nowMs = params.nowMs ?? Date.now();
        const day = resolveReportDay(nowMs, params.config.timezone);
        const narrativeExcerpt = params.result.narrativeWritten
          ? await extractLatestNarrativeExcerpt(params.workspaceDir)
          : undefined;
        const snapshot = buildSnapshotFromPipeline({
          workspaceDir: params.workspaceDir,
          day,
          timezone: params.config.timezone,
          nowMs,
          lightCount: params.result.lightCount,
          remCount: params.result.remCount,
          promotedCount: params.result.promotedCount,
          narrativeWritten: params.result.narrativeWritten,
          remBodyLines: params.result.remBodyLines,
          narrativeExcerpt,
          phasesRan: params.result.phasesRan,
        });
        await writeDailyReportSnapshot({ workspaceDir: params.workspaceDir, snapshot });
        return publishDailyReport({
          workspaceDir: params.workspaceDir,
          config: params.config.dailyReport,
          timezone: params.config.timezone,
          day,
          nowMs,
          snapshot,
          logger: api.logger,
        });
      };

      const maybeDeliverDailyReport = async (
        workspaceDir: string,
        published: DailyReportPublishResult
      ) => {
        const activeConfig = refreshConfig();
        const delivery = activeConfig.dailyReport.delivery;
        if (!delivery) return { delivered: false as const, reason: "no_delivery" as const };

        const decision = await evaluateDailyReportDelivery({
          workspaceDir,
          published,
          pushOn: delivery.pushOn ?? "changed",
        });
        if (!decision.deliver) {
          const reason = decision.reason;
          if (reason === "unchanged") {
            api.logger.info(
              `memory-lancedb-dreaming: daily report content unchanged (fingerprint=${published.contentFingerprint}), skipping push`
            );
          } else if (reason === "no_phases") {
            api.logger.info(
              "memory-lancedb-dreaming: no dreaming phases ran for this report, skipping push"
            );
          }
          return { delivered: false as const, reason };
        }

        const result = await deliverDailyReportMessage({
          api,
          delivery,
          text: published.text,
          logger: api.logger,
        });
        if (!result.ok) {
          return { delivered: false as const, error: result.error };
        }

        await writeDailyReportDeliveryState({
          workspaceDir,
          state: {
            version: 1,
            lastContentFingerprint: published.contentFingerprint,
            lastDeliveredDay: published.day,
            lastDeliveredAt: new Date().toISOString(),
          },
        }).catch((err) => {
          api.logger.warn(
            `memory-lancedb-dreaming: failed to record daily report delivery state: ${String(err)}`
          );
        });

        return { delivered: true as const };
      };

      const describeSkippedDelivery = (reason: DailyReportDeliverySkipReason) => {
        if (reason === "unchanged") {
          return "memory-lancedb-dreaming: daily report written (unchanged, push skipped)";
        }
        return "memory-lancedb-dreaming: daily report written (no phases, push skipped)";
      };

      const runDailyReportDelivery = async (workspaceDir: string) => {
        const activeConfig = refreshConfig();
        if (!activeConfig.dailyReport.enabled) {
          return { ok: false as const, reason: "daily_report_disabled" as const };
        }
        const nowMs = Date.now();
        const day = resolveReportDay(nowMs, activeConfig.timezone);
        try {
          const published = await publishDailyReport({
            workspaceDir,
            config: activeConfig.dailyReport,
            timezone: activeConfig.timezone,
            day,
            nowMs,
            logger: api.logger,
          });
          const deliveryResult = await maybeDeliverDailyReport(workspaceDir, published);
          return { ok: true as const, published, deliveryResult };
        } catch (err) {
          api.logger.error(
            `memory-lancedb-dreaming: daily report publish failed: ${String(err)}`
          );
          return { ok: false as const, reason: "error" as const, error: String(err) };
        }
      };

      const refreshConfig = () => {
        config = resolveDreamingConfig(rawConfig, api);
        return config;
      };

      const runLockedDreamingPipeline = async (params: {
        workspaceDir: string;
        phase?: "light" | "rem" | "deep" | "all";
      }) => {
        if (!tryBeginPipeline()) {
          api.logger.warn("memory-lancedb-dreaming: dreaming pipeline already running, skipping");
          return { ok: false as const, reason: "pipeline_busy" as const };
        }

        try {
          const activeConfig = refreshConfig();
          const db = createDreamingDb();
          const llm = resolveDreamingLlmRuntime(api);
          if (
            (activeConfig.rem.model || activeConfig.narrative.enabled) &&
            !llm.subagent &&
            !llm.llmComplete
          ) {
            api.logger.warn(
              "memory-lancedb-dreaming: LLM features requested but neither subagent nor runtime.llm.complete is available"
            );
          }
          const result = await runDreamingPipeline({
            db,
            workspaceDir: params.workspaceDir,
            config: activeConfig,
            logger: api.logger,
            llm,
            phase: params.phase,
          });
          await recordDreamingRun({
            workspaceDir: params.workspaceDir,
            phase: params.phase,
            result,
          }).catch((err) => {
            api.logger.warn(
              `memory-lancedb-dreaming: failed to record run metadata: ${String(err)}`
            );
          });
          let dailyReportPublished: DailyReportPublishResult | null = null;
          try {
            dailyReportPublished = await finalizeDailyReportFromPipeline({
              workspaceDir: params.workspaceDir,
              config: activeConfig,
              result,
              phase: params.phase,
            });
          } catch (err) {
            api.logger.warn(
              `memory-lancedb-dreaming: daily report finalize failed: ${String(err)}`
            );
          }
          return { ok: true as const, result, dailyReportPublished };
        } catch (err) {
          api.logger.error(`memory-lancedb-dreaming: dreaming phases failed: ${String(err)}`);
          return { ok: false as const, reason: "error" as const, error: String(err) };
        } finally {
          endPipeline();
        }
      };

      const tryResolveCron = (): CronService | null => {
        if (startupCron) return startupCron;

        const runtime = api.runtime as { cron?: unknown; deps?: { cron?: unknown } } | undefined;
        return (
          resolveCronServiceFromCandidate(runtime?.cron) ??
          resolveCronServiceFromCandidate(runtime?.deps?.cron) ??
          null
        );
      };

      const reconcileCron = async (reason: "startup" | "runtime") => {
        if (!config.autoManageCron) return;

        const cron = tryResolveCron() ?? startupCron;
        if (cron && !startupCron) startupCron = cron;

        const configKey = runtimeConfigKey(config);

        if (!cron) {
          if (config.enabled && !unavailableCronDebugEmitted) {
            logDebug(
              api,
              "memory-lancedb-dreaming: cron service not yet available; will retry reconciliation"
            );
            unavailableCronDebugEmitted = true;
          }
        } else {
          unavailableCronDebugEmitted = false;
        }

        if (reason === "runtime") {
          const now = Date.now();
          if (
            now - lastRuntimeReconcileAtMs < RUNTIME_CRON_RECONCILE_INTERVAL_MS &&
            lastRuntimeConfigKey === configKey &&
            lastRuntimeCronRef === cron
          ) {
            return;
          }
          lastRuntimeReconcileAtMs = now;
          lastRuntimeConfigKey = configKey;
          lastRuntimeCronRef = cron;
        }

        await reconcileManagedDreamingCron({
          cron,
          config: refreshConfig(),
          logger: api.logger,
        });
      };

      const scheduleCronRetries = () => {
        if (cronRetryTimer || !config.autoManageCron || !config.enabled) return;
        cronRetryAttempts = 0;
        cronRetryTimer = setInterval(() => {
          cronRetryAttempts += 1;
          if (cronRetryAttempts > STARTUP_CRON_MAX_RETRIES) {
            if (cronRetryTimer) clearInterval(cronRetryTimer);
            cronRetryTimer = null;
            api.logger.warn(
              `memory-lancedb-dreaming: cron reconciliation gave up after ${STARTUP_CRON_MAX_RETRIES} retries`
            );
            return;
          }
          void reconcileCron("startup").catch((err) => {
            api.logger.warn(
              `memory-lancedb-dreaming: cron retry reconciliation failed: ${String(err)}`
            );
          });
        }, STARTUP_CRON_RETRY_DELAY_MS);
      };

      warnIfCronHookBlocked(api, config.enabled);
      warnIfModelOverrideBlocked(api, config);

      const entryPolicy = summarizePluginEntryPolicy(api, config);
      api.logger.info(
        `memory-lancedb-dreaming: registered (enabled=${config.enabled}, cron=${config.cron}, cronHook=${entryPolicy.cronTriggerReady ? "ready" : "blocked"}, modelOverride=${entryPolicy.llmModelOverrideReady ? "ready" : "blocked"}, lancedbPlugin=${getResolvedLanceDbPluginId() ?? "not-configured"}, lancedbPath=${getCachedLancedbConfig()?.dbPath ?? "not-configured"})`
      );

      try {
        api.on("gateway_start", async (_event, ctx) => {
          const activeConfig = refreshConfig();
          if (!activeConfig.autoManageCron || !activeConfig.enabled) return;
          const cronCandidate = (ctx as { getCron?: () => unknown }).getCron?.();
          const cron = resolveCronServiceFromCandidate(cronCandidate) ?? tryResolveCron();
          if (cron) {
            startupCron = cron;
            if (cronRetryTimer) {
              clearInterval(cronRetryTimer);
              cronRetryTimer = null;
            }
            try {
              await reconcileCron("startup");
            } catch (err) {
              api.logger.warn(
                `memory-lancedb-dreaming: gateway_start cron reconciliation failed: ${String(err)}`
              );
            }
          } else {
            logDebug(api, "memory-lancedb-dreaming: gateway_start without cron service");
            scheduleCronRetries();
          }
        });
      } catch (err) {
        api.logger.warn(`memory-lancedb-dreaming: gateway_start hook failed: ${String(err)}`);
      }

      void reconcileCron("startup").catch((err) => {
        api.logger.warn(
          `memory-lancedb-dreaming: initial cron reconciliation failed: ${String(err)}`
        );
      });
      scheduleCronRetries();

      try {
        api.on("before_agent_reply", async (event, ctx) => {
          const activeConfig = refreshConfig();
          if (!activeConfig.enabled) return;

          try {
            if (activeConfig.autoManageCron) {
              await reconcileCron("runtime");
            }
          } catch (err) {
            api.logger.warn(
              `memory-lancedb-dreaming: runtime cron reconciliation failed: ${String(err)}`
            );
          }

          if (ctx.trigger !== "cron" && ctx.trigger !== "heartbeat") return;

          const workspaceDir = resolveWorkspace(ctx.workspaceDir);
          if (!workspaceDir) {
            api.logger.warn(
              "memory-lancedb-dreaming: cron hook skipped (no workspace configured)"
            );
            return { handled: true, reason: "memory-lancedb-dreaming: missing workspace" };
          }

          const body = event.cleanedBody ?? "";
          if (includesSystemEventToken(body, DAILY_REPORT_TRIGGER_TOKEN)) {
            api.logger.info("memory-lancedb-dreaming: daily report trigger received");
            const reportRun = await runDailyReportDelivery(workspaceDir);
            if (!reportRun.ok) {
              return {
                handled: true,
                reason: `memory-lancedb-dreaming: daily report failed: ${reportRun.error ?? reportRun.reason}`,
              };
            }
            if (reportRun.deliveryResult?.delivered) {
              return {
                handled: true,
                reason: "memory-lancedb-dreaming: daily report delivered",
              };
            }
            if (
              reportRun.deliveryResult &&
              "reason" in reportRun.deliveryResult &&
              (reportRun.deliveryResult.reason === "unchanged" ||
                reportRun.deliveryResult.reason === "no_phases")
            ) {
              return {
                handled: true,
                reason: describeSkippedDelivery(reportRun.deliveryResult.reason),
              };
            }
            if (reportRun.deliveryResult?.error) {
              api.logger.warn(
                `memory-lancedb-dreaming: daily report delivery failed: ${reportRun.deliveryResult.error}`
              );
              return {
                handled: true,
                reason: `memory-lancedb-dreaming: daily report written (delivery failed: ${reportRun.deliveryResult.error})`,
              };
            }
            return {
              handled: true,
              reason: "memory-lancedb-dreaming: daily report written",
            };
          }

          if (!includesSystemEventToken(body, DREAMING_TRIGGER_TOKEN)) return;

          api.logger.info("memory-lancedb-dreaming: dreaming trigger received, running phases...");

          const locked = await runLockedDreamingPipeline({ workspaceDir });
          if (!locked.ok) {
            if (locked.reason === "pipeline_busy") {
              return { handled: true, reason: "memory-lancedb-dreaming: pipeline busy" };
            }
            return {
              handled: true,
              reason: `memory-lancedb-dreaming: dreaming failed: ${locked.error ?? "unknown error"}`,
            };
          }

          const { result, dailyReportPublished } = locked;
          api.logger.info(
            `memory-lancedb-dreaming: dreaming phases completed (light=${result.lightCount}, rem=${result.remCount}, promoted=${result.promotedCount}, narrative=${result.narrativeWritten})`
          );
          if (dailyReportPublished) {
            api.logger.info(
              `memory-lancedb-dreaming: daily report written after pipeline (day=${dailyReportPublished.day}); delivery deferred to daily report cron`
            );
          }
          return {
            handled: true,
            reason: dailyReportPublished
              ? "memory-lancedb-dreaming: dreaming processed with daily report written"
              : "memory-lancedb-dreaming: dreaming processed",
          };
        });
      } catch (err) {
        api.logger.warn(`memory-lancedb-dreaming: before_agent_reply hook failed: ${String(err)}`);
      }

      try {
        api.on("gateway_stop", () => {
          resetPipelineForShutdown();
          if (cronRetryTimer) {
            clearInterval(cronRetryTimer);
            cronRetryTimer = null;
          }
          api.logger.info("memory-lancedb-dreaming: gateway stopping");
        });
      } catch (err) {
        api.logger.warn(`memory-lancedb-dreaming: gateway_stop hook failed: ${String(err)}`);
      }

      try {
        api.registerTool(
          {
            name: "dreaming_status",
            label: "Dreaming Status",
            description: "Check dreaming plugin status, memory stats, and last dream report",
            parameters: Type.Object({}),
            async execute(_toolCallId, _params) {
              let memoryCount: number | null = null;
              let lancedbError: string | undefined;
              try {
                const db = createDreamingDb();
                memoryCount = await db.count();
              } catch (err) {
                lancedbError = String(err);
                api.logger.warn(`memory-lancedb-dreaming: status count failed: ${lancedbError}`);
              }
              const activeConfig = refreshConfig();
              const workspaceDir = resolveWorkspace();
              let lastRun: Awaited<ReturnType<typeof readDreamingRunMetadata>> | null = null;
              if (workspaceDir) {
                try {
                  lastRun = await readDreamingRunMetadata(workspaceDir);
                } catch (err) {
                  api.logger.warn(
                    `memory-lancedb-dreaming: failed to read run metadata: ${String(err)}`
                  );
                }
              }
              const status = {
                plugin: "memory-lancedb-dreaming",
                version: PLUGIN_VERSION,
                enabled: activeConfig.enabled,
                cron: activeConfig.cron,
                timezone: activeConfig.timezone,
                autoManageCron: activeConfig.autoManageCron,
                hooks: summarizePluginEntryPolicy(api, activeConfig),
                lancedb: getCachedLancedbConfig(),
                lancedbPluginId: getResolvedLanceDbPluginId(),
                lancedbError,
                memoryCount,
                effectiveConfig: summarizeDreamingConfig(activeConfig),
                llm: {
                  subagentAvailable: isSubagentRuntimeAvailable(api),
                  llmCompleteAvailable: isLlmCompleteAvailable(api),
                },
                phases: {
                  light: activeConfig.light.enabled ? "enabled" : "disabled",
                  rem: activeConfig.rem.enabled ? "enabled" : "disabled",
                  deep: activeConfig.deep.enabled ? "enabled" : "disabled",
                },
                narrative: activeConfig.narrative.enabled ? "enabled" : "disabled",
                dailyReport: {
                  enabled: activeConfig.dailyReport.enabled,
                  cron: activeConfig.dailyReport.cron,
                  effectiveCron: resolveEffectiveDailyReportCronExpr(activeConfig).expr,
                  languages: activeConfig.dailyReport.languages,
                  delivery: activeConfig.dailyReport.delivery ?? null,
                },
                lastRun: lastRun
                  ? {
                      lastRunAt: lastRun.lastRunAt,
                      lastRunPhase: lastRun.lastRunPhase ?? null,
                      lastRunResult: lastRun.lastRunResult ?? null,
                    }
                  : null,
              };
              return {
                content: [{ type: "text", text: JSON.stringify(status, null, 2) }],
                details: status,
              };
            },
          },
          { optional: true }
        );
      } catch (err) {
        api.logger.warn(`memory-lancedb-dreaming: dreaming_status tool registration failed: ${String(err)}`);
      }

      try {
        api.registerTool(
          {
            name: "dreaming_trigger",
            label: "Dreaming Trigger",
            description: "Manually trigger a dreaming cycle for the specified phase",
            parameters: Type.Object({
              phase: Type.Optional(
                Type.String({
                  description: "Dreaming phase to run: 'light', 'rem', 'deep', or 'all'",
                })
              ),
            }),
            async execute(_toolCallId, params) {
              const toolParams = params as { phase?: string };
              const phase = (toolParams.phase ?? "all") as "light" | "rem" | "deep" | "all";
              const workspaceDir = resolveWorkspace();
              if (!workspaceDir) {
                return {
                  content: [
                    {
                      type: "text",
                      text: "Dreaming trigger failed: no workspace configured (set agents.defaults.workspace in ~/.openclaw/openclaw.json or session context).",
                    },
                  ],
                  details: { ok: false, reason: "missing_workspace" },
                };
              }
              const locked = await runLockedDreamingPipeline({ workspaceDir, phase });
              if (!locked.ok) {
                if (locked.reason === "pipeline_busy") {
                  return {
                    content: [
                      {
                        type: "text",
                        text: "Dreaming trigger skipped: another dreaming cycle is already running.",
                      },
                    ],
                    details: { ok: false, reason: locked.reason },
                  };
                }
                return {
                  content: [
                    {
                      type: "text",
                      text: `Dreaming trigger failed: ${locked.error ?? "unknown error"}`,
                    },
                  ],
                  details: { ok: false, reason: locked.reason, error: locked.error },
                };
              }
              const { result } = locked;
              const details = { ok: true, phase, ...result };
              return {
                content: [
                  {
                    type: "text",
                    text: `Dreaming cycle (${phase}) completed: light=${result.lightCount}, rem=${result.remCount}, promoted=${result.promotedCount}, narrative=${result.narrativeWritten}.`,
                  },
                ],
                details,
              };
            },
          },
          { optional: true }
        );
      } catch (err) {
        api.logger.warn(`memory-lancedb-dreaming: dreaming_trigger tool registration failed: ${String(err)}`);
      }

      try {
        api.registerService({
          id: "memory-lancedb-dreaming",
          start: () => {
            api.logger.info("memory-lancedb-dreaming: service started");
          },
          stop: () => {
            resetPipelineForShutdown();
            if (cronRetryTimer) {
              clearInterval(cronRetryTimer);
              cronRetryTimer = null;
            }
            api.logger.info("memory-lancedb-dreaming: service stopped");
          },
        });
      } catch (err) {
        api.logger.warn(`memory-lancedb-dreaming: service registration failed: ${String(err)}`);
      }
    } catch (err) {
      api.logger.error(`memory-lancedb-dreaming: register failed: ${String(err)}`);
    }
  },
});
