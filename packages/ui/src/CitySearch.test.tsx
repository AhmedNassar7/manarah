import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { City } from "@manarah/core";
import { CitySearch } from "./CitySearch.js";
import { LanguageProvider } from "./i18n/index.js";

const makkah: City = {
  name: "Makkah",
  asciiName: "Makkah",
  countryCode: "SA",
  latitude: 21.42664,
  longitude: 39.82563,
  population: 1578722,
  timezone: "Asia/Riyadh",
  alternateNames: ["Mecca"],
};

function fakeSearch(query: string): City[] {
  return query.toLowerCase().includes("mecca") || query.toLowerCase().includes("makkah") ? [makkah] : [];
}

function fakeAsyncSearch(query: string): Promise<City[]> {
  return Promise.resolve(fakeSearch(query));
}

describe("CitySearch", () => {
  it("shows no results list before anything is typed", () => {
    render(<CitySearch search={fakeSearch} onSelect={vi.fn()} />);
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("shows matching results as the user types (synchronous search)", async () => {
    const user = userEvent.setup();
    render(<CitySearch search={fakeSearch} onSelect={vi.fn()} />);

    await user.type(screen.getByRole("searchbox"), "Mecca");

    expect(await screen.findByRole("button", { name: "Makkah, Saudi Arabia" })).toBeInTheDocument();
  });

  it("shows matching results once an async search resolves — the real @manarah/data shape", async () => {
    const user = userEvent.setup();
    render(<CitySearch search={fakeAsyncSearch} onSelect={vi.fn()} />);

    await user.type(screen.getByRole("searchbox"), "Mecca");

    expect(await screen.findByRole("button", { name: "Makkah, Saudi Arabia" })).toBeInTheDocument();
  });

  it("shows a 'no results' message when nothing matches", async () => {
    const user = userEvent.setup();
    render(<CitySearch search={fakeSearch} onSelect={vi.fn()} />);

    await user.type(screen.getByRole("searchbox"), "Nowhereville");

    expect(await screen.findByText("No matching cities")).toBeInTheDocument();
  });

  it("calls onSelect with the chosen city and clears the query", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<CitySearch search={fakeSearch} onSelect={onSelect} />);

    await user.type(screen.getByRole("searchbox"), "Mecca");
    await user.click(await screen.findByRole("button", { name: "Makkah, Saudi Arabia" }));

    expect(onSelect).toHaveBeenCalledWith(makkah);
    expect(screen.getByRole("searchbox")).toHaveValue("");
  });
});

describe("CitySearch in Arabic", () => {
  it("labels results in Arabic — the city's Arabic name and the country's — and falls back to the English name when there is none", async () => {
    const user = userEvent.setup();
    const cairo: City = { ...makkah, name: "Cairo", asciiName: "Cairo", nameAr: "القاهرة", countryCode: "EG" };
    const tainan: City = { ...makkah, name: "Tainan", asciiName: "Tainan", countryCode: "TW", nameAr: undefined };
    render(
      <LanguageProvider language="ar" onLanguageChange={() => {}}>
        <CitySearch search={() => [cairo, tainan]} onSelect={vi.fn()} />
      </LanguageProvider>,
    );
    await user.type(screen.getByRole("searchbox"), "x");
    expect(await screen.findByRole("button", { name: "القاهرة، مصر" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Tainan، / })).toBeInTheDocument();
  });
});
