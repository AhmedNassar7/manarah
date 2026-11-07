import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { AZKAR_VOICES, voicesForCategory, type AzkarVoice } from "./voices.js";
import { EVENING_CATEGORY_ID, MORNING_CATEGORY_ID } from "./morning-evening.js";

const asmari: AzkarVoice = { id: "a", nameAr: "أ", nameEn: "A", files: { morning: "a-morning.mp3", evening: "a-evening.mp3" } };
const judhyan: AzkarVoice = { id: "j", nameAr: "ج", nameEn: "J", files: { evening: "j-evening.mp3" } };

describe("voicesForCategory", () => {
  it("lists the voices that have a recording of this list, in order", () => {
    expect(voicesForCategory(MORNING_CATEGORY_ID, [asmari, judhyan]).map((v) => v.id)).toEqual(["a"]);
    expect(voicesForCategory(EVENING_CATEGORY_ID, [asmari, judhyan]).map((v) => [v.id, v.file])).toEqual([
      ["a", "a-evening.mp3"],
      ["j", "j-evening.mp3"],
    ]);
  });

  it("offers nothing for any other list, or when there are no voices", () => {
    expect(voicesForCategory("28", [asmari])).toEqual([]);
    expect(voicesForCategory(MORNING_CATEGORY_ID, [])).toEqual([]);
  });
});

describe("AZKAR_VOICES", () => {
  const folder = resolve(__dirname, "../../../../apps/web/public/azkar-audio");

  it("every recording it names exists in the app's azkar-audio folder, and ids are unique", () => {
    expect(new Set(AZKAR_VOICES.map((v) => v.id)).size).toBe(AZKAR_VOICES.length);
    for (const v of AZKAR_VOICES) {
      expect(Object.keys(v.files).length, v.id).toBeGreaterThan(0);
      for (const file of Object.values(v.files)) {
        expect(file, v.id).toMatch(/^[\w.-]+\.mp3$/);
        expect(existsSync(resolve(folder, file!)), `${v.id}: ${file}`).toBe(true);
      }
    }
  });
});
