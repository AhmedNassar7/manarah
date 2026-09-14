/**
 * Minimal key-value contract shared by every platform adapter, so `packages/ui`
 * and `packages/core` never need to know whether they're running in the
 * extension (chrome.storage.sync) or the web/desktop/mobile app (IndexedDB).
 */
export interface Store {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  keys(): Promise<string[]>;
  getAll(): Promise<Record<string, unknown>>;
}
