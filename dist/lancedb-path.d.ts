export declare function setLanceDbPathResolver(fn: (input: string) => string): void;
/**
 * Resolve LanceDB filesystem path without letting OpenClaw resolvePath strip absolute
 * out-of-workspace paths (a common cause of connect(undefined) in tool contexts).
 */
export declare function resolveDbPathForLance(cfgPath: string): string;
/** URI passed to lancedb.connect — plain absolute/relative paths (not file://). */
export declare function toLanceDbConnectUri(resolvedPath: string): string;
//# sourceMappingURL=lancedb-path.d.ts.map