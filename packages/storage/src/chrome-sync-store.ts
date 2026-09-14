import type { Store } from "./store.js";

/**
 * Store adapter for the extension, backed by chrome.storage.sync — Chrome
 * mirrors it across the user's signed-in profile automatically, for free.
 * Note: chrome.storage.sync has an ~100KB total quota and an 8KB per-item
 * limit, so large blobs (downloaded audio, full Quran text) belong elsewhere.
 */
export class ChromeSyncStore implements Store {
  async get<T>(key: string): Promise<T | undefined> {
    const result = await chrome.storage.sync.get(key);
    return result[key] as T | undefined;
  }

  async set<T>(key: string, value: T): Promise<void> {
    await chrome.storage.sync.set({ [key]: value });
  }

  async remove(key: string): Promise<void> {
    await chrome.storage.sync.remove(key);
  }

  async keys(): Promise<string[]> {
    const all = await chrome.storage.sync.get(null);
    return Object.keys(all);
  }

  async getAll(): Promise<Record<string, unknown>> {
    return chrome.storage.sync.get(null);
  }
}
