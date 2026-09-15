import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { normalizeDegrees, QiblaCompass } from "./QiblaCompass.js";

describe("normalizeDegrees", () => {
  it("leaves an in-range value unchanged", () => {
    expect(normalizeDegrees(90)).toBe(90);
  });

  it("wraps a negative value into [0, 360)", () => {
    expect(normalizeDegrees(-30)).toBe(330);
  });

  it("wraps a value >= 360 back into range", () => {
    expect(normalizeDegrees(400)).toBe(40);
  });

  it("maps 360 itself to 0", () => {
    expect(normalizeDegrees(360)).toBe(0);
  });
});

describe("QiblaCompass", () => {
  it("shows the rounded bearing and formatted distance", () => {
    render(<QiblaCompass bearing={58.4} distanceKm={1234.5} />);
    expect(screen.getByText("58° from North")).toBeInTheDocument();
    expect(screen.getByText("1235 km to the Kaaba")).toBeInTheDocument();
  });

  it("formats a short distance with two decimal places", () => {
    render(<QiblaCompass bearing={0} distanceKm={0.42} />);
    expect(screen.getByText("0.42 km to the Kaaba")).toBeInTheDocument();
  });

  it("rotates the arrow by the bearing alone when no heading is known (static, north-up)", () => {
    render(<QiblaCompass bearing={120} distanceKm={100} />);
    const arrow = screen.getByRole("img");
    expect(arrow).toHaveStyle({ transform: "rotate(120deg)" });
    expect(arrow).toHaveAttribute("aria-label", "Qibla direction: 120 degrees from north");
  });

  it("rotates the arrow relative to the device heading when one is provided", () => {
    render(<QiblaCompass bearing={120} distanceKm={100} heading={45} />);
    const arrow = screen.getByRole("img");
    expect(arrow).toHaveStyle({ transform: "rotate(75deg)" });
  });

  it("normalizes a negative relative rotation into [0, 360)", () => {
    render(<QiblaCompass bearing={20} distanceKm={100} heading={340} />);
    const arrow = screen.getByRole("img");
    // 20 - 340 = -320, normalized to 40
    expect(arrow).toHaveStyle({ transform: "rotate(40deg)" });
  });

  it("uses a heading-relative aria-label once a live heading is known", () => {
    render(<QiblaCompass bearing={120} distanceKm={100} heading={45} />);
    expect(screen.getByRole("img")).toHaveAttribute(
      "aria-label",
      "Qibla direction relative to your current heading"
    );
  });

  describe("lock state", () => {
    it("never locks in static mode, no matter how close the bearing is to 0", () => {
      render(<QiblaCompass bearing={0.5} distanceKm={100} />);
      expect(screen.getByRole("img")).not.toHaveAttribute(
        "aria-label",
        "Qibla direction: locked onto the Kaaba"
      );
    });

    it("locks once the live heading is within the threshold of the bearing", () => {
      // bearing 120, heading 119 -> rotation 1deg, well under the 3deg threshold
      render(<QiblaCompass bearing={120} distanceKm={100} heading={119} />);
      expect(screen.getByRole("img")).toHaveAttribute(
        "aria-label",
        "Qibla direction: locked onto the Kaaba"
      );
    });

    it("locks across the 0/360 wrap boundary", () => {
      // bearing 2, heading 359 -> rotation 3deg... just at the edge; use 358 for a clear 4deg -> not locked,
      // and 359.5 for a clear <3deg case that wraps through 0.
      render(<QiblaCompass bearing={2} distanceKm={100} heading={359.5} />);
      expect(screen.getByRole("img")).toHaveAttribute(
        "aria-label",
        "Qibla direction: locked onto the Kaaba"
      );
    });

    it("does not lock when the heading is off by more than the threshold", () => {
      render(<QiblaCompass bearing={120} distanceKm={100} heading={90} />);
      expect(screen.getByRole("img")).not.toHaveAttribute(
        "aria-label",
        "Qibla direction: locked onto the Kaaba"
      );
    });

    it("adds the locked class to the card only while locked", () => {
      const { container, rerender } = render(<QiblaCompass bearing={120} distanceKm={100} heading={119} />);
      expect(container.querySelector(".qibla-compass")).toHaveClass("qibla-compass-locked");

      rerender(<QiblaCompass bearing={120} distanceKm={100} heading={90} />);
      expect(container.querySelector(".qibla-compass")).not.toHaveClass("qibla-compass-locked");
    });
  });
});
