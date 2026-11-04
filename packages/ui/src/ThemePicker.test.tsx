import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { THEME_IDS } from "@manarah/core";
import { LanguageProvider } from "./i18n/index.js";
import { ThemePicker } from "./ThemePicker.js";

describe("ThemePicker", () => {
  it("offers every theme, with the current one selected", () => {
    render(<ThemePicker theme="emerald" onThemeChange={() => {}} />);
    const options = screen.getAllByRole("radio");
    expect(options).toHaveLength(THEME_IDS.length);
    expect(screen.getByRole("radio", { name: /Emerald/ })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: /Ocean/ })).toHaveAttribute("aria-checked", "false");
  });

  it("reports the chosen theme", () => {
    const onThemeChange = vi.fn();
    render(<ThemePicker theme="auto" onThemeChange={onThemeChange} />);
    fireEvent.click(screen.getByRole("radio", { name: /Midnight/ }));
    expect(onThemeChange).toHaveBeenCalledWith("midnight");
  });

  it("names the themes in Arabic", () => {
    render(
      <LanguageProvider language="ar" onLanguageChange={() => {}}>
        <ThemePicker theme="auto" onThemeChange={() => {}} />
      </LanguageProvider>
    );
    expect(screen.getByRole("radio", { name: "تلقائي" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "ورق المخطوطة" })).toBeInTheDocument();
  });
});
