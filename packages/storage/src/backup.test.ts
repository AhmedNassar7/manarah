import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { exportStore, importStore } from "./backup.js";
import { IndexedDbStore } from "./indexed-db-store.js";

describe("export/import round-trip", () => {
  let source: IndexedDbStore;
  let destination: IndexedDbStore;

  beforeEach(() => {
    source = new IndexedDbStore(`backup-source-${Math.random()}`);
    destination = new IndexedDbStore(`backup-destination-${Math.random()}`);
  });

  it("restores every key/value from an export into a different, empty store", async () => {
    await source.set("theme", "dark");
    await source.set("settings", { coordinates: { latitude: 1, longitude: 2 } });

    const json = await exportStore(source);
    await importStore(destination, json);

    expect(await destination.getAll()).toEqual(await source.getAll());
  });

  it("produces valid, versioned JSON with an exportedAt timestamp", async () => {
    await source.set("a", 1);
    const json = await exportStore(source);
    const parsed = JSON.parse(json);

    expect(parsed.formatVersion).toBe(1);
    expect(typeof parsed.exportedAt).toBe("string");
    expect(parsed.data).toEqual({ a: 1 });
  });

  it("importing overwrites matching keys but leaves other existing keys untouched", async () => {
    await destination.set("keepMe", "untouched");
    await destination.set("theme", "light");

    await source.set("theme", "dark");
    const json = await exportStore(source);
    await importStore(destination, json);

    expect(await destination.get("keepMe")).toBe("untouched");
    expect(await destination.get("theme")).toBe("dark");
  });

  it("rejects a backup with an unsupported format version", async () => {
    const badBackup = JSON.stringify({ formatVersion: 999, exportedAt: new Date().toISOString(), data: {} });
    await expect(importStore(destination, badBackup)).rejects.toThrow(/format version/);
  });
});
