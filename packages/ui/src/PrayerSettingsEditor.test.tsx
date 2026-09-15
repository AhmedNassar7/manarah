import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { PrayerTimesSettings } from "@manarah/core";
import { PrayerSettingsEditor, type CalculationMethodOption } from "./PrayerSettingsEditor.js";

const methods: CalculationMethodOption[] = [
  { id: "UmmAlQura", label: "Umm al-Qura University, Makkah" },
  { id: "NorthAmerica", label: "Islamic Society of North America (ISNA)" },
];

const settings: PrayerTimesSettings = { method: "UmmAlQura", asrSchool: "Standard" };

describe("PrayerSettingsEditor", () => {
  it("renders the current method and Asr school pre-selected", () => {
    render(<PrayerSettingsEditor methods={methods} settings={settings} onChange={vi.fn()} />);

    expect(screen.getByRole("combobox", { name: "Calculation method" })).toHaveValue("UmmAlQura");
    expect(screen.getByRole("combobox", { name: "Asr calculation" })).toHaveValue("Standard");
  });

  it("calls onChange with the new method, keeping the Asr school unchanged", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PrayerSettingsEditor methods={methods} settings={settings} onChange={onChange} />);

    await user.selectOptions(screen.getByRole("combobox", { name: "Calculation method" }), "NorthAmerica");

    expect(onChange).toHaveBeenCalledWith({ method: "NorthAmerica", asrSchool: "Standard" });
  });

  it("calls onChange with the new Asr school, keeping the method unchanged", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PrayerSettingsEditor methods={methods} settings={settings} onChange={onChange} />);

    await user.selectOptions(screen.getByRole("combobox", { name: "Asr calculation" }), "Hanafi");

    expect(onChange).toHaveBeenCalledWith({ method: "UmmAlQura", asrSchool: "Hanafi" });
  });
});
