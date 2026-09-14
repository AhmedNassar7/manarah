import type { Store } from "./store.js";

const BACKUP_FORMAT_VERSION = 1;

interface BackupFile {
  formatVersion: number;
  exportedAt: string;
  data: Record<string, unknown>;
}

/** Serializes everything in `store` to a JSON string for manual backup/transfer. */
export async function exportStore(store: Store): Promise<string> {
  const backup: BackupFile = {
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    data: await store.getAll(),
  };
  return JSON.stringify(backup, null, 2);
}

/** Restores a JSON string produced by `exportStore` into `store`, overwriting matching keys. */
export async function importStore(store: Store, json: string): Promise<void> {
  const backup = JSON.parse(json) as BackupFile;
  if (backup.formatVersion !== BACKUP_FORMAT_VERSION) {
    throw new Error(`Unsupported backup format version: ${backup.formatVersion}`);
  }
  for (const [key, value] of Object.entries(backup.data)) {
    await store.set(key, value);
  }
}
