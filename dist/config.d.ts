import { Type, type Static } from "typebox";
export declare const DREAMING_PHASES: readonly ["light", "rem", "deep"];
export type DreamingPhase = (typeof DREAMING_PHASES)[number];
export declare const LightDreamingConfigSchema: Type.TObject<{
    enabled: Type.TBoolean;
    lookbackDays: Type.TNumber;
    limit: Type.TNumber;
}>;
export declare const RemDreamingConfigSchema: Type.TObject<{
    enabled: Type.TBoolean;
    lookbackDays: Type.TNumber;
    limit: Type.TNumber;
    minPatternStrength: Type.TNumber;
    lastingTruthCooldownDays: Type.TNumber;
    clusterSpotlightCooldownDays: Type.TNumber;
    model: Type.TOptional<Type.TString>;
}>;
export declare const DeepDreamingConfigSchema: Type.TObject<{
    enabled: Type.TBoolean;
    maxPromotions: Type.TOptional<Type.TNumber>;
    /** @deprecated Use maxPromotions */
    limit: Type.TOptional<Type.TNumber>;
    minScore: Type.TNumber;
    minRecallCount: Type.TNumber;
    minUniqueQueries: Type.TNumber;
    recencyHalfLifeDays: Type.TNumber;
    maxAgeDays: Type.TNumber;
}>;
export declare const NarrativeLanguageSchema: Type.TUnion<[Type.TLiteral<"zh">, Type.TLiteral<"en">]>;
export declare const DailyReportDeliverySchema: Type.TObject<{
    channel: Type.TString;
    to: Type.TString;
    pushOn: Type.TOptional<Type.TUnion<[Type.TLiteral<"always">, Type.TLiteral<"changed">]>>;
    mode: Type.TOptional<Type.TUnion<[Type.TLiteral<"announce">, Type.TLiteral<"direct">, Type.TLiteral<"webhook">]>>;
    threadId: Type.TOptional<Type.TUnion<[Type.TString, Type.TNumber]>>;
    accountId: Type.TOptional<Type.TString>;
}>;
export declare const DailyReportConfigSchema: Type.TObject<{
    enabled: Type.TBoolean;
    cron: Type.TString;
    timezone: Type.TOptional<Type.TString>;
    languages: Type.TArray<Type.TUnion<[Type.TLiteral<"zh">, Type.TLiteral<"en">]>>;
    delivery: Type.TOptional<Type.TObject<{
        channel: Type.TString;
        to: Type.TString;
        pushOn: Type.TOptional<Type.TUnion<[Type.TLiteral<"always">, Type.TLiteral<"changed">]>>;
        mode: Type.TOptional<Type.TUnion<[Type.TLiteral<"announce">, Type.TLiteral<"direct">, Type.TLiteral<"webhook">]>>;
        threadId: Type.TOptional<Type.TUnion<[Type.TString, Type.TNumber]>>;
        accountId: Type.TOptional<Type.TString>;
    }>>;
}>;
export declare const NarrativeConfigSchema: Type.TObject<{
    enabled: Type.TBoolean;
    languages: Type.TArray<Type.TUnion<[Type.TLiteral<"zh">, Type.TLiteral<"en">]>>;
    model: Type.TOptional<Type.TString>;
}>;
export declare const DreamingConfigSchema: Type.TObject<{
    enabled: Type.TBoolean;
    cron: Type.TString;
    timezone: Type.TString;
    light: Type.TObject<{
        enabled: Type.TBoolean;
        lookbackDays: Type.TNumber;
        limit: Type.TNumber;
    }>;
    rem: Type.TObject<{
        enabled: Type.TBoolean;
        lookbackDays: Type.TNumber;
        limit: Type.TNumber;
        minPatternStrength: Type.TNumber;
        lastingTruthCooldownDays: Type.TNumber;
        clusterSpotlightCooldownDays: Type.TNumber;
        model: Type.TOptional<Type.TString>;
    }>;
    deep: Type.TObject<{
        enabled: Type.TBoolean;
        maxPromotions: Type.TOptional<Type.TNumber>;
        /** @deprecated Use maxPromotions */
        limit: Type.TOptional<Type.TNumber>;
        minScore: Type.TNumber;
        minRecallCount: Type.TNumber;
        minUniqueQueries: Type.TNumber;
        recencyHalfLifeDays: Type.TNumber;
        maxAgeDays: Type.TNumber;
    }>;
    narrative: Type.TObject<{
        enabled: Type.TBoolean;
        languages: Type.TArray<Type.TUnion<[Type.TLiteral<"zh">, Type.TLiteral<"en">]>>;
        model: Type.TOptional<Type.TString>;
    }>;
    dailyReport: Type.TObject<{
        enabled: Type.TBoolean;
        cron: Type.TString;
        timezone: Type.TOptional<Type.TString>;
        languages: Type.TArray<Type.TUnion<[Type.TLiteral<"zh">, Type.TLiteral<"en">]>>;
        delivery: Type.TOptional<Type.TObject<{
            channel: Type.TString;
            to: Type.TString;
            pushOn: Type.TOptional<Type.TUnion<[Type.TLiteral<"always">, Type.TLiteral<"changed">]>>;
            mode: Type.TOptional<Type.TUnion<[Type.TLiteral<"announce">, Type.TLiteral<"direct">, Type.TLiteral<"webhook">]>>;
            threadId: Type.TOptional<Type.TUnion<[Type.TString, Type.TNumber]>>;
            accountId: Type.TOptional<Type.TString>;
        }>>;
    }>;
    autoManageCron: Type.TBoolean;
    verboseLogging: Type.TBoolean;
}>;
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
export declare function resolveDeepConfig(deep: DeepConfig): ResolvedDeepConfig;
export declare const DEFAULT_DREAMING_CONFIG: DreamingConfig;
//# sourceMappingURL=config.d.ts.map