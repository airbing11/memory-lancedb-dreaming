import { Type } from "typebox";
export const DREAMING_PHASES = ["light", "rem", "deep"];
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
    model: Type.Optional(Type.String({ description: "Model override for REM semantic theme naming" })),
});
export const DeepDreamingConfigSchema = Type.Object({
    enabled: Type.Boolean({ default: true }),
    maxPromotions: Type.Optional(Type.Number({ default: 5, minimum: 1, maximum: 50, description: "Max promotions per run" })),
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
    mode: Type.Optional(Type.Union([Type.Literal("announce"), Type.Literal("direct"), Type.Literal("webhook")])),
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
export function resolveDeepConfig(deep) {
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
export const DEFAULT_DREAMING_CONFIG = {
    enabled: true,
    cron: "0 3 * * *",
    timezone: "Asia/Shanghai",
    light: { enabled: true, lookbackDays: 2, limit: 100 },
    rem: { enabled: true, lookbackDays: 7, limit: 10, minPatternStrength: 0.45 },
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
//# sourceMappingURL=config.js.map