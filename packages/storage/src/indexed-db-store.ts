import Dexie, { type Table } from "dexie";
import type { Store } from "./store.js";

interface KvRow {
  key: string;
  value: unknown;
}

class KvDatabase extends Dexie {
  kv!: Table<KvRow, string>;

  constructor(databaseName: string) {
    super(databaseName);
    this.version(1).stores({ kv: "key" });
  }
}

/** Store adapter for web/desktop/mobile, backed by IndexedDB via Dexie. */
export class IndexedDbStore implements Store {
  private db: KvDatabase;

  constructor(databaseName = "quran-companion") {
    this.db = new KvDatabase(databaseName);
  }

  async get<T>(key: string): Promise<T | undefined> {
    const row = await this.db.kv.get(key);
    return row?.value as T | undefined;
  }

  async set<T>(key: string, value: T): Promise<void> {
    await this.db.kv.put({ key, value });
  }

  async remove(key: string): Promise<void> {
    await this.db.kv.delete(key);
  }

  async keys(): Promise<string[]> {
    return this.db.kv.toCollection().primaryKeys();
  }

  async getAll(): Promise<Record<string, unknown>> {
    const rows = await this.db.kv.toArray();
    return Object.fromEntries(rows.map((row) => [row.key, row.value]));
  }
}
