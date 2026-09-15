import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { City } from "@manarah/core";
import { CitySearch } from "./CitySearch.js";

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

describe("CitySearch", () => {
  it("shows no results list before anything is typed", () => {
    render(<CitySearch search={fakeSearch} onSelect={vi.fn()} />);
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("shows matching results as the user types", async () => {
    const user = userEvent.setup();
    render(<CitySearch search={fakeSearch} onSelect={vi.fn()} />);

    await user.type(screen.getByRole("searchbox"), "Mecca");

    expect(screen.getByRole("button", { name: "Makkah, SA" })).toBeInTheDocument();
  });

  it("shows a 'no results' message when nothing matches", async () => {
    const user = userEvent.setup();
    render(<CitySearch search={fakeSearch} onSelect={vi.fn()} />);

    await user.type(screen.getByRole("searchbox"), "Nowhereville");

    expect(screen.getByText("No matching cities")).toBeInTheDocument();
  });

  it("calls onSelect with the chosen city and clears the query", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<CitySearch search={fakeSearch} onSelect={onSelect} />);

    await user.type(screen.getByRole("searchbox"), "Mecca");
    await user.click(screen.getByRole("button", { name: "Makkah, SA" }));

    expect(onSelect).toHaveBeenCalledWith(makkah);
    expect(screen.getByRole("searchbox")).toHaveValue("");
  });
});
