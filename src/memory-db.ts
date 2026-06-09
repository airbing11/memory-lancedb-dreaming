import { randomUUID } from "node:crypto";
import { loadLanceDbModule, resolveLanceDbConnectFn } from "./lancedb-runtime.js";
import { toLanceDbConnectUri } from "./lancedb-path.js";

const TABLE_NAME = "memories";

const BASE_COLUMNS = ["id", "text", "importance", "category"] as const;

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LanceConnection = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LanceTable = any;

function mapRow(
  row: unknown,
  options: { includeVector?: boolean }
): LanceMemoryEntry {
  const r = row as Record<string, unknown>;
  return {
    id: String(r.id),
    text: String(r.text),
    ...(options.includeVector && Array.isArray(r.vector)
      ? { vector: r.vector as number[] }
      : {}),
    importance: Number(r.importance ?? 0),
    category: String(r.category ?? "other"),
  };
}

function sortByImportance(
  entries: LanceMemoryEntry[]
): LanceMemoryEntry[] {
  return [...entries].sort(
    (a, b) =>
      b.importance - a.importance || a.id.localeCompare(b.id)
  );
}

/**
 * LanceDB memory store compatible with @openclaw/memory-lancedb MemoryDB.
 * Does not assume a `createdAt` column (older LanceDB schemas omit it).
 */
export class MemoryDB {
  private db: LanceConnection | null = null;
  private table: LanceTable | null = null;
  private initPromise: Promise<void> | null = null;
  private readonly connectUri: string;

  constructor(
    dbPath: string,
    private readonly vectorDim: number,
    private readonly storageOptions?: Record<string, string>
  ) {
    const trimmed = dbPath?.trim();
    if (!trimmed) {
      throw new Error(
        "memory-lancedb-dreaming: MemoryDB requires a non-empty dbPath (got undefined/empty — check resolvePath/cache)"
      );
    }
    this.connectUri = toLanceDbConnectUri(trimmed);
  }

  async ensureInitialized(): Promise<void> {
    if (this.table) return;
    if (this.initPromise) return this.initPromise;
    this.initPromise = this.doInitialize().catch((error) => {
      this.initPromise = null;
      throw error;
    });
    return this.initPromise;
  }

  private async doInitialize(): Promise<void> {
    const lancedb = await loadLanceDbModule();
    const connect = resolveLanceDbConnectFn(lancedb);

    const hasStorage =
      this.storageOptions && Object.keys(this.storageOptions).length > 0;

    this.db = (hasStorage
      ? await connect(this.connectUri, { storageOptions: this.storageOptions })
      : await connect(this.connectUri)) as LanceConnection;

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

  async list(
    limit?: number,
    options: {
      orderByImportance?: boolean;
      includeVector?: boolean;
    } = {}
  ) {
    await this.ensureInitialized();
    const select = options.includeVector
      ? [...BASE_COLUMNS, "vector"]
      : [...BASE_COLUMNS];
    let query = this.table!.query().select(select);
    if (!options.orderByImportance && limit !== undefined) {
      query = query.limit(limit) as typeof query;
    }
    let entries = (await query.toArray()).map((row: unknown) =>
      mapRow(row, { includeVector: options.includeVector })
    );
    if (options.orderByImportance) {
      entries = sortByImportance(entries);
    }
    return limit === undefined ? entries : entries.slice(0, limit);
  }

  async search(vector: number[], limit = 5, minScore = 0.5): Promise<LanceSearchResult[]> {
    await this.ensureInitialized();
    return (await this.table!.vectorSearch(vector).limit(limit).toArray())
      .map((row: Record<string, unknown> & { _distance?: number }) => {
        const score = 1 / (1 + (row._distance ?? 0));
        return {
          entry: mapRow(row, { includeVector: true }),
          score,
        };
      })
      .filter((result: LanceSearchResult) => result.score >= minScore);
  }

  async store(entry: Omit<LanceMemoryEntry, "id">): Promise<LanceMemoryEntry> {
    await this.ensureInitialized();
    const fullEntry: LanceMemoryEntry = {
      ...entry,
      id: randomUUID(),
    };
    await this.table!.add([fullEntry]);
    return fullEntry;
  }

  async delete(id: string): Promise<boolean> {
    await this.ensureInitialized();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      throw new Error(`Invalid memory ID format: ${id}`);
    }
    await this.table!.delete(`id = '${id}'`);
    return true;
  }

  async count(): Promise<number> {
    await this.ensureInitialized();
    return this.table!.countRows();
  }
}

const EMBEDDING_DIMENSIONS: Record<string, number> = {
  "text-embedding-3-small": 1536,
  "text-embedding-3-large": 3072,
};

export function vectorDimsForModel(model: string): number {
  const dims = EMBEDDING_DIMENSIONS[model];
  if (!dims) throw new Error(`Unsupported embedding model: ${model}`);
  return dims;
}
