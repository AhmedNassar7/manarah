import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { City } from "@manarah/core";
import { LocationSummary } from "./LocationSummary.js";

const cairo: City = {
  name: "Cairo",
  asciiName: "Cairo",
  countryCode: "EG",
  latitude: 30.0444,
  longitude: 31.2357,
  population: 9_000_000,
  timezone: "Africa/Cairo",
};

const baseProps = {
  search: () => [cairo],
  onCitySelect: vi.fn(),
};

describe("LocationSummary", () => {
  it("shows the saved city with its country and how it was set", () => {
    render(
      <LocationSummary
        {...baseProps}
        coordinates={{ latitude: 30.04, longitude: 31.24 }}
        location={{ source: "city", name: "Cairo", countryCode: "EG" }}
      />
    );
    expect(screen.getByText("Cairo, Egypt")).toBeInTheDocument();
    expect(screen.getByText("Chosen by you — saved")).toBeInTheDocument();
    // Picker stays tucked away until asked for.
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
  });

  it("falls back to coordinates for a GPS fix with no nearby city name", () => {
    render(
      <LocationSummary
        {...baseProps}
        coordinates={{ latitude: 30.0444, longitude: 31.2357 }}
        location={{ source: "gps" }}
      />
    );
    expect(screen.getByText("30.04°, 31.24°")).toBeInTheDocument();
    expect(screen.getByText("Detected from your device")).toBeInTheDocument();
  });

  it("opens the picker straight away when no location is saved yet", () => {
    render(
      <LocationSummary {...baseProps} coordinates={undefined} location={undefined} onUseCurrentLocation={() => {}} />
    );
    expect(screen.getByText(/Where are you\?/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "📡 Use my current location" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Or search for your city…")).toBeInTheDocument();
  });

  it("Change opens the picker, and choosing a city saves it and closes the picker", async () => {
    const onCitySelect = vi.fn();
    render(
      <LocationSummary
        {...baseProps}
        onCitySelect={onCitySelect}
        coordinates={{ latitude: 21.4, longitude: 39.8 }}
        location={{ source: "gps", name: "Mecca", countryCode: "SA" }}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Change" }));
    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText("Or search for your city…"), { target: { value: "Cai" } });
    });
    fireEvent.click(await screen.findByRole("button", { name: "Cairo, EG" }));
    expect(onCitySelect).toHaveBeenCalledWith(cairo);
    expect(screen.queryByPlaceholderText("Or search for your city…")).not.toBeInTheDocument();
  });

  it("re-detects from the device, and shows progress while locating", () => {
    const onUseCurrentLocation = vi.fn();
    const { rerender } = render(
      <LocationSummary
        {...baseProps}
        coordinates={undefined}
        location={undefined}
        onUseCurrentLocation={onUseCurrentLocation}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "📡 Use my current location" }));
    expect(onUseCurrentLocation).toHaveBeenCalled();

    rerender(
      <LocationSummary
        {...baseProps}
        coordinates={undefined}
        location={undefined}
        onUseCurrentLocation={onUseCurrentLocation}
        locating
      />
    );
    expect(screen.getByRole("button", { name: "Finding your location…" })).toBeDisabled();
  });

  it("shows a geolocation error", () => {
    render(<LocationSummary {...baseProps} coordinates={undefined} location={undefined} error="User denied" />);
    expect(screen.getByRole("alert")).toHaveTextContent("User denied");
  });
});
