import { Type, type Static } from "typebox";

export const DREAMING_PHASES = ["light", "rem", "deep"] as const;
export type DreamingPhase = (typeof DREAMING_PHASES)[number];

export const LightDreamingConfigSchema = Type.Object({
  enabled: Type.Boolean({ default: true }),
  lookbackDays: Type.Number({ default: 2, minimum: 1, maximum: 30 }),
  limit: Type.Number({ default: 100, minimum: 1, maximum: 500 }),
});

export const RemDreamingConfigSchema = Type.Object({
  enabled: Type.Boolean({ default: true }),
  lookbackDays: Type.Number({ default: 7, minimum: 1, maximum: 90 }),
  limit: Type.Number({ default: 10, minimum: 1, maximum: 50 }),
  minPatternStrength: Type.Number({ default: 0.45, minimum: 0.1, maximum: 1.0 }),
  lastingTruthCooldownDays: Type.Number({
    default: 7,
    minimum: 1,
    maximum: 30,
    description: "Skip memory IDs recently shown under Possible Lasting Truths",
  }),
  clusterSpotlightCooldownDays: Type.Number({
    default: 5,
    minimum: 1,
    maximum: 30,
    description: "Rotate cluster exemplar memories recently used in REM reflections",
  }),
  model: Type.Optional(
    Type.String({ description: "Model override for REM semantic theme naming" })
  ),
});

export const DeepDreamingConfigSchema = Type.Object({
  enabled: Type.Boolean({ default: true }),
  maxPromotions: Type.Optional(
    Type.Number({ default: 5, minimum: 1, maximum: 50, description: "Max promotions per run" })
  ),
  /** @deprecated Use maxPromotions */
  limit: Type.Optional(Type.Number({ minimum: 1, maximum: 50 })),
  minScore: Type.Number({ default: 0.7, minimum: 0.1, maximum: 1.0 }),
  minRecallCount: Type.Number({ default: 3, minimum: 1, maximum: 20 }),
  minUniqueQueries: Type.Number({ default: 1, minimum: 1, maximum: 20 }),
  recencyHalfLifeDays: Type.Number({ default: 14, minimum: 1, maximum: 90 }),
  maxAgeDays: Type.Number({ default: 30, minimum: 1, maximum: 365 }),
});

export const NarrativeLanguageSchema = Type.Union([
  Type.Literal("zh"),
  Type.Literal("en"),
]);

export const DailyReportDeliverySchema = Type.Object({
  channel: Type.String({ minLength: 1 }),
  to: Type.String({ minLength: 1 }),
  pushOn: Type.Optional(
    Type.Union([Type.Literal("always"), Type.Literal("changed")], {
      default: "changed",
      description: "Push when content changes (changed) or every run (always)",
    })
  ),
  mode: Type.Optional(
    Type.Union([Type.Literal("announce"), Type.Literal("direct"), Type.Literal("webhook")])
  ),
  threadId: Type.Optional(Type.Union([Type.String(), Type.Number()])),
  accountId: Type.Optional(Type.String()),
});

export const DailyReportConfigSchema = Type.Object({
  enabled: Type.Boolean({ default: true }),
  cron: Type.String({ default: "0 4 * * *" }),
  timezone: Type.Optional(Type.String()),
  languages: Type.Array(NarrativeLanguageSchema, { default: ["zh"] }),
  delivery: Type.Optional(DailyReportDeliverySchema),
});

export const NarrativeConfigSchema = Type.Object({
  enabled: Type.Boolean({ default: true }),
  languages: Type.Array(NarrativeLanguageSchema, { default: ["zh", "en"] }),
  model: Type.Optional(Type.String({ description: "Model override for narrative generation" })),
});

export const DreamingConfigSchema = Type.Object({
  enabled: Type.Boolean({ default: true }),
  cron: Type.String({ default: "0 3 * * *" }),
  timezone: Type.String({ default: "Asia/Shanghai" }),
  light: LightDreamingConfigSchema,
  rem: RemDreamingConfigSchema,
  deep: DeepDreamingConfigSchema,
  narrative: NarrativeConfigSchema,
  dailyReport: DailyReportConfigSchema,
  autoManageCron: Type.Boolean({ default: true }),
  verboseLogging: Type.Boolean({ default: false }),
});

export type DreamingConfig = Static<typeof DreamingConfigSchema>;
export type LightConfig = Static<typeof LightDreamingConfigSchema>;
export type RemConfig = Static<typeof RemDreamingConfigSchema>;
export type DeepConfig = Static<typeof DeepDreamingConfigSchema>;
export type NarrativeConfig = Static<typeof NarrativeConfigSchema>;
export type NarrativeLanguage = Static<typeof NarrativeLanguageSchema>;
export type DailyReportLanguage = NarrativeLanguage;
export type DailyReportDelivery = Static<typeof DailyReportDeliverySchema>;
export type DailyReportConfig = Static<typeof DailyReportConfigSchema>;

/** Resolved deep config with maxPromotions always set (backward compat for legacy `limit`). */
export type ResolvedDeepConfig = Omit<DeepConfig, "maxPromotions" | "limit"> & {
  maxPromotions: number;
};

export function resolveDeepConfig(deep: DeepConfig): ResolvedDeepConfig {
  const maxPromotions = deep.maxPromotions ?? deep.limit ?? 5;
  return {
    enabled: deep.enabled,
    minScore: deep.minScore,
    minRecallCount: deep.minRecallCount,
    minUniqueQueries: deep.minUniqueQueries,
    recencyHalfLifeDays: deep.recencyHalfLifeDays,
    maxAgeDays: deep.maxAgeDays,
    maxPromotions,
  };
}

export const DEFAULT_DREAMING_CONFIG: DreamingConfig = {
  enabled: true,
  cron: "0 3 * * *",
  timezone: "Asia/Shanghai",
  light: { enabled: true, lookbackDays: 2, limit: 100 },
  rem: { enabled: true, lookbackDays: 7, limit: 10, minPatternStrength: 0.45, lastingTruthCooldownDays: 7, clusterSpotlightCooldownDays: 5 },
  deep: {
    enabled: true,
    maxPromotions: 5,
    minScore: 0.7,
    minRecallCount: 3,
    minUniqueQueries: 1,
    recencyHalfLifeDays: 14,
    maxAgeDays: 30,
  },
  narrative: { enabled: true, languages: ["zh", "en"] },
  dailyReport: {
    enabled: true,
    cron: "0 4 * * *",
    languages: ["zh"],
  },
  autoManageCron: true,
  verboseLogging: false,
};
