import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QiblaFinder } from "./QiblaFinder.js";

describe("QiblaFinder", () => {
  describe("without a live compass", () => {
    it("gives the direction in degrees and plain words, with the distance", () => {
      render(<QiblaFinder bearing={135.6} distanceKm={1234.4} />);
      expect(screen.getByText("Face 136° — Southeast")).toBeInTheDocument();
      expect(screen.getByText("136° from North")).toBeInTheDocument();
      expect(screen.getByText("1,234 km")).toBeInTheDocument();
      expect(screen.getByRole("img")).toHaveAttribute(
        "aria-label",
        "Compass: the Qibla is 136 degrees from north, Southeast"
      );
    });

    it("keeps the rose north-up", () => {
      const { container } = render(<QiblaFinder bearing={135} distanceKm={1000} />);
      expect(container.querySelector(".qibla-finder-rose")).toHaveStyle({ transform: "rotate(0deg)" });
    });

    it("offers to enable the live compass only when a handler is given", () => {
      const { unmount } = render(<QiblaFinder bearing={135} distanceKm={1000} />);
      expect(screen.queryByRole("button", { name: "Enable live compass" })).not.toBeInTheDocument();
      unmount();

      const onEnableLiveCompass = vi.fn();
      render(<QiblaFinder bearing={135} distanceKm={1000} onEnableLiveCompass={onEnableLiveCompass} />);
      fireEvent.click(screen.getByRole("button", { name: "Enable live compass" }));
      expect(onEnableLiveCompass).toHaveBeenCalled();
    });
  });

  describe("with a live compass", () => {
    it("says which way to turn, and how far", () => {
      const { rerender } = render(<QiblaFinder bearing={136} distanceKm={1000} heading={100} />);
      expect(screen.getByText("Turn right 36°")).toBeInTheDocument();

      rerender(<QiblaFinder bearing={136} distanceKm={1000} heading={170} />);
      expect(screen.getByText("Turn left 34°")).toBeInTheDocument();
    });

    it("confirms once the user faces the Qibla", () => {
      const { container } = render(<QiblaFinder bearing={136} distanceKm={1000} heading={135} />);
      expect(screen.getByText("✓ You're facing the Qibla")).toBeInTheDocument();
      expect(container.querySelector(".qibla-finder")).toHaveClass("qibla-finder-facing");
    });

    it("turns the rose against the heading so north stays real north", () => {
      const { container } = render(<QiblaFinder bearing={136} distanceKm={1000} heading={90} />);
      expect(container.querySelector(".qibla-finder-rose")).toHaveStyle({ transform: "rotate(-90deg)" });
    });

    it("rotates the short way across the 0°/360° wrap instead of spinning a full circle", () => {
      const { container, rerender } = render(<QiblaFinder bearing={136} distanceKm={1000} heading={350} />);
      const rose = () => container.querySelector(".qibla-finder-rose");
      expect(rose()).toHaveStyle({ transform: "rotate(-350deg)" });

      rerender(<QiblaFinder bearing={136} distanceKm={1000} heading={10} />);
      // 350° → 10° is a 20° move, so -350 → -370, not -350 → -10.
      expect(rose()).toHaveStyle({ transform: "rotate(-370deg)" });
    });

    it("hides the enable button once a heading is arriving", () => {
      render(<QiblaFinder bearing={136} distanceKm={1000} heading={100} onEnableLiveCompass={() => {}} />);
      expect(screen.queryByRole("button", { name: "Enable live compass" })).not.toBeInTheDocument();
    });
  });
});
