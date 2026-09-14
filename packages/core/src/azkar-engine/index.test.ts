import { describe, expect, it } from "vitest";
import { applyAzkarSchedules, getEffectiveCategoriesForTrigger, type AzkarCategory, type AzkarSchedule } from "./index.js";

const categories: AzkarCategory[] = [
  { id: "27", name: "Morning and evening remembrance", trigger: "morning", items: [] },
  { id: "25", name: "After completing the prayer", trigger: "post-salah", items: [] },
  { id: "96", name: "Invocation for traveling", trigger: "situational", items: [] },
];

describe("applyAzkarSchedules", () => {
  it("keeps every category on its default trigger when there are no schedules", () => {
    const assignments = applyAzkarSchedules(categories, []);
    expect(assignments).toHaveLength(3);
    expect(assignments.find((a) => a.category.id === "27")?.trigger).toBe("morning");
    expect(assignments.find((a) => a.category.id === "96")?.trigger).toBe("situational");
  });

  it("drops a muted category entirely", () => {
    const schedules: AzkarSchedule[] = [{ categoryId: "27", trigger: "morning", muted: true }];
    const assignments = applyAzkarSchedules(categories, schedules);
    expect(assignments.find((a) => a.category.id === "27")).toBeUndefined();
    expect(assignments).toHaveLength(2);
  });

  it("remaps a situational category to a fixed trigger", () => {
    const schedules: AzkarSchedule[] = [{ categoryId: "96", trigger: "post-salah", muted: false }];
    const assignments = applyAzkarSchedules(categories, schedules);
    expect(assignments.find((a) => a.category.id === "96")?.trigger).toBe("post-salah");
  });

  it("remaps a category to custom-time and carries the time through", () => {
    const schedules: AzkarSchedule[] = [
      { categoryId: "96", trigger: "custom-time", customTime: "14:30", muted: false },
    ];
    const assignments = applyAzkarSchedules(categories, schedules);
    const remapped = assignments.find((a) => a.category.id === "96");
    expect(remapped?.trigger).toBe("custom-time");
    expect(remapped?.customTime).toBe("14:30");
  });

  it("leaves categories with no matching schedule entry untouched", () => {
    const schedules: AzkarSchedule[] = [{ categoryId: "96", trigger: "post-salah", muted: false }];
    const assignments = applyAzkarSchedules(categories, schedules);
    expect(assignments.find((a) => a.category.id === "27")?.trigger).toBe("morning");
    expect(assignments.find((a) => a.category.id === "25")?.trigger).toBe("post-salah");
  });
});

describe("getEffectiveCategoriesForTrigger", () => {
  it("returns only categories currently assigned to the requested trigger", () => {
    const assignments = applyAzkarSchedules(categories, [
      { categoryId: "96", trigger: "morning", muted: false },
    ]);
    const morning = getEffectiveCategoriesForTrigger(assignments, "morning");
    expect(morning.map((c) => c.id).sort()).toEqual(["27", "96"]);
  });

  it("returns an empty array when nothing matches", () => {
    const assignments = applyAzkarSchedules(categories, []);
    expect(getEffectiveCategoriesForTrigger(assignments, "before-sleep")).toEqual([]);
  });
});
