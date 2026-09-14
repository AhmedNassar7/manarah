import { beforeEach, describe, expect, it } from "vitest";
import { ChromeSyncStore } from "./chrome-sync-store.js";

/**
 * Minimal fake of the chrome.storage.sync surface ChromeSyncStore actually
 * uses, backed by an in-memory object — enough to unit-test our adapter
 * without a real browser. Not a claim that this fully models Chrome's API
 * (quotas, onChanged events, etc. are out of scope here).
 */
function installFakeChromeStorage(): { data: Record<string, unknown> } {
  const data: Record<string, unknown> = {};

  (globalThis as { chrome?: unknown }).chrome = {
    storage: {
      sync: {
        get: async (keyOrKeys: string | string[] | null) => {
          if (keyOrKeys === null) return { ...data };
          const keys = Array.isArray(keyOrKeys) ? keyOrKeys : [keyOrKeys];
          const result: Record<string, unknown> = {};
          for (const key of keys) {
            if (key in data) result[key] = data[key];
          }
          return result;
        },
        set: async (items: Record<string, unknown>) => {
          Object.assign(data, items);
        },
        remove: async (key: string) => {
          delete data[key];
        },
      },
    },
  };

  return { data };
}

describe("ChromeSyncStore", () => {
  let fake: { data: Record<string, unknown> };
  let store: ChromeSyncStore;

  beforeEach(() => {
    fake = installFakeChromeStorage();
    store = new ChromeSyncStore();
  });

  it("returns undefined for a key that was never set", async () => {
    expect(await store.get("missing")).toBeUndefined();
  });

  it("round-trips a value through set/get", async () => {
    await store.set("theme", "dark");
    expect(await store.get("theme")).toBe("dark");
  });

  it("writes through to the underlying chrome.storage.sync data", async () => {
    await store.set("count", 5);
    expect(fake.data.count).toBe(5);
  });

  it("removes a key", async () => {
    await store.set("temp", "x");
    await store.remove("temp");
    expect(await store.get("temp")).toBeUndefined();
  });

  it("keys() lists every stored key", async () => {
    await store.set("a", 1);
    await store.set("b", 2);
    expect((await store.keys()).sort()).toEqual(["a", "b"]);
  });

  it("getAll() returns every key/value pair", async () => {
    await store.set("a", 1);
    await store.set("b", 2);
    expect(await store.getAll()).toEqual({ a: 1, b: 2 });
  });
});
