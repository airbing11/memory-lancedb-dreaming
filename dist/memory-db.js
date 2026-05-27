import { randomUUID } from "node:crypto";
import { loadLanceDbModule, resolveLanceDbConnectFn } from "./lancedb-runtime.js";
import { toLanceDbConnectUri } from "./lancedb-path.js";
const TABLE_NAME = "memories";
const BASE_COLUMNS = ["id", "text", "importance", "category"];
function mapRow(row, options) {
    const r = row;
    return {
        id: String(r.id),
        text: String(r.text),
        ...(options.includeVector && Array.isArray(r.vector)
            ? { vector: r.vector }
            : {}),
        importance: Number(r.importance ?? 0),
        category: String(r.category ?? "other"),
    };
}
function sortByImportance(entries) {
    return [...entries].sort((a, b) => b.importance - a.importance || a.id.localeCompare(b.id));
}
/**
 * LanceDB memory store compatible with @openclaw/memory-lancedb MemoryDB.
 * Does not assume a `createdAt` column (older LanceDB schemas omit it).
 */
export class MemoryDB {
    vectorDim;
    storageOptions;
    db = null;
    table = null;
    initPromise = null;
    connectUri;
    constructor(dbPath, vectorDim, storageOptions) {
        this.vectorDim = vectorDim;
        this.storageOptions = storageOptions;
        const trimmed = dbPath?.trim();
        if (!trimmed) {
            throw new Error("memory-lancedb-dreaming: MemoryDB requires a non-empty dbPath (got undefined/empty — check resolvePath/cache)");
        }
        this.connectUri = toLanceDbConnectUri(trimmed);
    }
    async ensureInitialized() {
        if (this.table)
            return;
        if (this.initPromise)
            return this.initPromise;
        this.initPromise = this.doInitialize().catch((error) => {
            this.initPromise = null;
            throw error;
        });
        return this.initPromise;
    }
    async doInitialize() {
        const lancedb = await loadLanceDbModule();
        const connect = resolveLanceDbConnectFn(lancedb);
        const hasStorage = this.storageOptions && Object.keys(this.storageOptions).length > 0;
        this.db = (hasStorage
            ? await connect(this.connectUri, { storageOptions: this.storageOptions })
            : await connect(this.connectUri));
        if ((await this.db.tableNames()).includes(TABLE_NAME)) {
            this.table = await this.db.openTable(TABLE_NAME);
            return;
        }
        this.table = await this.db.createTable(TABLE_NAME, [
            {
                id: "__schema__",
                text: "",
                vector: Array.from({ length: this.vectorDim }).fill(0),
                importance: 0,
                category: "other",
            },
        ]);
        await this.table.delete('id = "__schema__"');
    }
    async list(limit, options = {}) {
        await this.ensureInitialized();
        const select = options.includeVector
            ? [...BASE_COLUMNS, "vector"]
            : [...BASE_COLUMNS];
        let query = this.table.query().select(select);
        if (!options.orderByImportance && limit !== undefined) {
            query = query.limit(limit);
        }
        let entries = (await query.toArray()).map((row) => mapRow(row, { includeVector: options.includeVector }));
        if (options.orderByImportance) {
            entries = sortByImportance(entries);
        }
        return limit === undefined ? entries : entries.slice(0, limit);
    }
    async search(vector, limit = 5, minScore = 0.5) {
        await this.ensureInitialized();
        return (await this.table.vectorSearch(vector).limit(limit).toArray())
            .map((row) => {
            const score = 1 / (1 + (row._distance ?? 0));
            return {
                entry: mapRow(row, { includeVector: true }),
                score,
            };
        })
            .filter((result) => result.score >= minScore);
    }
    async store(entry) {
        await this.ensureInitialized();
        const fullEntry = {
            ...entry,
            id: randomUUID(),
        };
        await this.table.add([fullEntry]);
        return fullEntry;
    }
    async delete(id) {
        await this.ensureInitialized();
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
            throw new Error(`Invalid memory ID format: ${id}`);
        }
        await this.table.delete(`id = '${id}'`);
        return true;
    }
    async count() {
        await this.ensureInitialized();
        return this.table.countRows();
    }
}
const EMBEDDING_DIMENSIONS = {
    "text-embedding-3-small": 1536,
    "text-embedding-3-large": 3072,
};
export function vectorDimsForModel(model) {
    const dims = EMBEDDING_DIMENSIONS[model];
    if (!dims)
        throw new Error(`Unsupported embedding model: ${model}`);
    return dims;
}
//# sourceMappingURL=memory-db.js.map