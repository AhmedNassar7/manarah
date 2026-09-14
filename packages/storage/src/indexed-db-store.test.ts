import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { IndexedDbStore } from "./indexed-db-store.js";

describe("IndexedDbStore", () => {
  let store: IndexedDbStore;

  beforeEach(() => {
    // A fresh database name per test avoids cross-test state via fake-indexeddb's shared global.
    store = new IndexedDbStore(`test-db-${Math.random()}`);
  });

  it("returns undefined for a key that was never set", async () => {
    expect(await store.get("missing")).toBeUndefined();
  });

  it("round-trips a value through set/get", async () => {
    await store.set("theme", "dark");
    expect(await store.get("theme")).toBe("dark");
  });

  it("round-trips a complex object value", async () => {
    const value = { coordinates: { latitude: 30.13, longitude: 31.34 }, list: [1, 2, 3] };
    await store.set("settings", value);
    expect(await store.get("settings")).toEqual(value);
  });

  it("overwrites an existing key on a second set", async () => {
    await store.set("count", 1);
    await store.set("count", 2);
    expect(await store.get("count")).toBe(2);
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
