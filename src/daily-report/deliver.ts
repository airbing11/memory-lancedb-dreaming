import {
  sendDurableMessageBatch,
  type DurableMessageBatchSendResult,
} from "openclaw/plugin-sdk/channel-message-runtime";
import type { OpenClawPluginApi } from "openclaw/plugin-sdk/plugin-entry";
import type { DailyReportDelivery } from "../config.js";
import type { PluginLogger } from "../cron.js";

type OutboundChannel = Parameters<typeof sendDurableMessageBatch>[0]["channel"];

function describeSendFailure(send: DurableMessageBatchSendResult): string {
  if (send.status === "failed" || send.status === "partial_failed") {
    return send.error instanceof Error ? send.error.message : String(send.error);
  }
  if (send.status === "suppressed") {
    return `suppressed (${send.reason})`;
  }
  return `unexpected send status: ${send.status}`;
}

export async function deliverDailyReportMessage(params: {
  api: OpenClawPluginApi;
  delivery: DailyReportDelivery;
  text: string;
  logger: PluginLogger;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const channel = params.delivery.channel as OutboundChannel;

  try {
    const send = await sendDurableMessageBatch({
      cfg: params.api.config,
      channel,
      to: params.delivery.to,
      accountId: params.delivery.accountId,
      threadId: params.delivery.threadId,
      payloads: [{ text: params.text }],
      bestEffort: false,
    });

    if (send.status === "sent") {
      params.logger.info(
        `memory-lancedb-dreaming: daily report delivered via ${params.delivery.channel} to ${params.delivery.to}`
      );
      return { ok: true };
    }

    const error = describeSendFailure(send);
    params.logger.warn(
      `memory-lancedb-dreaming: daily report delivery failed (${params.delivery.channel}): ${error}`
    );
    return { ok: false, error };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    params.logger.error(
      `memory-lancedb-dreaming: daily report delivery failed (${params.delivery.channel}): ${error}`
    );
    return { ok: false, error };
  }
}
