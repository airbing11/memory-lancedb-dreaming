declare module "@openclaw/memory-lancedb/dist/lancedb-runtime.js" {
  export function loadLanceDbModule(
    logger?: { info?: (m: string) => void; warn?: (m: string) => void; error?: (m: string) => void }
  ): Promise<typeof import("@lancedb/lancedb")>;
}
