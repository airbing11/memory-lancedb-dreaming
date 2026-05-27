export type LanceMemoryEntry = {
    id: string;
    text: string;
    vector?: number[];
    importance: number;
    category: string;
};
export type LanceSearchResult = {
    entry: LanceMemoryEntry;
    score: number;
};
/**
 * LanceDB memory store compatible with @openclaw/memory-lancedb MemoryDB.
 * Does not assume a `createdAt` column (older LanceDB schemas omit it).
 */
export declare class MemoryDB {
    private readonly vectorDim;
    private readonly storageOptions?;
    private db;
    private table;
    private initPromise;
    private readonly connectUri;
    constructor(dbPath: string, vectorDim: number, storageOptions?: Record<string, string> | undefined);
    ensureInitialized(): Promise<void>;
    private doInitialize;
    list(limit?: number, options?: {
        orderByImportance?: boolean;
        includeVector?: boolean;
    }): Promise<any>;
    search(vector: number[], limit?: number, minScore?: number): Promise<LanceSearchResult[]>;
    store(entry: Omit<LanceMemoryEntry, "id">): Promise<LanceMemoryEntry>;
    delete(id: string): Promise<boolean>;
    count(): Promise<number>;
}
export declare function vectorDimsForModel(model: string): number;
//# sourceMappingURL=memory-db.d.ts.map