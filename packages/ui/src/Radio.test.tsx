import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { RadioStation } from "@manarah/core";
import { LanguageProvider } from "./i18n/index.js";
import { RadioBrowser, RadioMiniPlayer, type RadioBrowserProps } from "./Radio.js";

const st = (id: number, nameAr: string, nameEn: string, group: RadioStation["group"] = "reciter", variant?: string): RadioStation => ({
  id,
  nameAr,
  nameEn,
  url: `https://example.test/${id}`,
  group,
  ...(variant ? { variant } : {}),
});
const stations = [
  st(1, "إذاعة القرآن الكريم - السعودية", "Holy Quran Radio (Saudi Arabia)", "general"),
  st(10, "مشاري العفاسي", "Mishary Alafasi"),
  st(11, "عبدالباسط عبدالصمد", "Abdulbasit Abdulsamad"),
  st(12, "عبدالباسط عبدالصمد", "Abdulbasit Abdulsamad", "reciter", "warsh"),
  st(30, "أذكار الصباح", "Morning remembrance", "azkar"),
];

function props(over: Partial<RadioBrowserProps> = {}): RadioBrowserProps {
  return { stations, favorites: [], status: "idle", onPlay: () => {}, onPause: () => {}, onResume: () => {}, onToggleFavorite: () => {}, ...over };
}

describe("RadioBrowser", () => {
  it("lists the stations, with the Saudi Quran Radio first and a reading told apart from the plain one", () => {
    render(<RadioBrowser {...props()} />);
    const items = screen.getAllByRole("listitem");
    expect(within(items[0]).getByText("Holy Quran Radio (Saudi Arabia)")).toBeInTheDocument();
    expect(within(items[2]).getByText("Warsh from Nafi'")).toBeInTheDocument();
    expect(screen.getByText("5 stations")).toBeInTheDocument();
  });

  it("plays a station when it is tapped", () => {
    const onPlay = vi.fn();
    render(<RadioBrowser {...props({ onPlay })} />);
    fireEvent.click(screen.getByRole("button", { name: "Play Mishary Alafasi" }));
    expect(onPlay).toHaveBeenCalledWith(stations[1]);
  });

  it("pauses the station that is playing, and resumes it when paused", () => {
    const onPause = vi.fn();
    const onResume = vi.fn();
    const { rerender } = render(<RadioBrowser {...props({ currentId: 10, status: "playing", onPause, onResume })} />);
    const row = screen.getAllByRole("button", { name: "Pause Mishary Alafasi" })[0];
    expect(row).toHaveAttribute("aria-current", "true");
    fireEvent.click(row);
    expect(onPause).toHaveBeenCalledTimes(1);
    rerender(<RadioBrowser {...props({ currentId: 10, status: "paused", onPause, onResume })} />);
    fireEvent.click(screen.getAllByRole("button", { name: "Play Mishary Alafasi" })[0]);
    expect(onResume).toHaveBeenCalledTimes(1);
  });

  it("starts the station again, rather than resuming, after it failed", () => {
    const onPlay = vi.fn();
    render(<RadioBrowser {...props({ currentId: 10, status: "error", onPlay })} />);
    expect(screen.getByRole("status")).toHaveTextContent("This station is not available right now. Try another one.");
    fireEvent.click(screen.getAllByRole("button", { name: "Play Mishary Alafasi" })[0]);
    expect(onPlay).toHaveBeenCalledWith(stations[1]);
  });

  it("says when it is the connection that is missing", () => {
    render(<RadioBrowser {...props({ currentId: 10, status: "offline" })} />);
    expect(screen.getByRole("status")).toHaveTextContent("The radio needs an internet connection.");
  });

  it("offers to continue with the last station when nothing is loaded", () => {
    const onPlay = vi.fn();
    render(<RadioBrowser {...props({ lastId: 10, onPlay })} />);
    fireEvent.click(screen.getByRole("button", { name: "Continue with Mishary Alafasi" }));
    expect(onPlay).toHaveBeenCalledWith(stations[1]);
  });

  it("keeps a station with a star, and shows it under Favourites", () => {
    const onToggle = vi.fn();
    const { rerender } = render(<RadioBrowser {...props({ onToggleFavorite: onToggle })} />);
    fireEvent.click(screen.getByRole("button", { name: "Add Mishary Alafasi to favourites" }));
    expect(onToggle).toHaveBeenCalledWith(10);

    rerender(<RadioBrowser {...props({ favorites: [10] })} />);
    expect(screen.getByRole("button", { name: "Remove Mishary Alafasi from favourites" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Favourites (1)" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });

  it("explains the empty Favourites list", () => {
    render(<RadioBrowser {...props()} />);
    fireEvent.click(screen.getByRole("button", { name: "Favourites" }));
    expect(screen.getByText("Tap the star on a station to keep it here.")).toBeInTheDocument();
  });

  it("narrows by kind and by search", () => {
    render(<RadioBrowser {...props()} />);
    fireEvent.click(screen.getByRole("button", { name: "Azkar & ruqyah" }));
    expect(screen.getAllByRole("listitem").map((li) => li.textContent)).toEqual([expect.stringContaining("Morning remembrance")]);
    fireEvent.click(screen.getByRole("button", { name: "All" }));
    fireEvent.change(screen.getByRole("searchbox", { name: "Search stations" }), { target: { value: "misha" } });
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    fireEvent.change(screen.getByRole("searchbox", { name: "Search stations" }), { target: { value: "zzz" } });
    expect(screen.getByText("No station matches your search.")).toBeInTheDocument();
  });

  it("is in Arabic, right to left, searchable by the Arabic name however it is spelled", () => {
    render(
      <LanguageProvider language="ar" onLanguageChange={() => {}}>
        <RadioBrowser {...props()} />
      </LanguageProvider>,
    );
    expect(document.querySelector(".radio")).toHaveAttribute("dir", "rtl");
    expect(screen.getByText("إذاعة القرآن الكريم - السعودية")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "إذاعات القرآن" })).toBeInTheDocument();
    fireEvent.change(screen.getByRole("searchbox", { name: "ابحث عن إذاعة" }), { target: { value: "مشاري العفاسي".replace("ا", "أ") } });
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    fireEvent.change(screen.getByRole("searchbox", { name: "ابحث عن إذاعة" }), { target: { value: "ورش" } });
    expect(screen.getByText("لا توجد إذاعة تطابق بحثك.")).toBeInTheDocument();
    expect(screen.queryByText(/Play|stations|Search/)).not.toBeInTheDocument();
  });

  it("shows the reading in Arabic in Arabic mode", () => {
    render(
      <LanguageProvider language="ar" onLanguageChange={() => {}}>
        <RadioBrowser {...props()} />
      </LanguageProvider>,
    );
    expect(screen.getByText("ورش عن نافع")).toBeInTheDocument();
  });
});

describe("RadioMiniPlayer", () => {
  it("shows the station and what it is doing, links back to the Radio page, and pauses and stops", () => {
    const onToggle = vi.fn();
    const onStop = vi.fn();
    render(<RadioMiniPlayer station={stations[1]} status="playing" onToggle={onToggle} onStop={onStop} />);
    const region = screen.getByRole("region", { name: "Now playing" });
    expect(within(region).getByRole("link")).toHaveAttribute("href", "#/radio");
    expect(within(region).getByText("Mishary Alafasi")).toBeInTheDocument();
    expect(within(region).getByRole("status")).toHaveTextContent("Live");
    fireEvent.click(within(region).getByRole("button", { name: "Pause" }));
    expect(onToggle).toHaveBeenCalledTimes(1);
    fireEvent.click(within(region).getByRole("button", { name: "Stop and close" }));
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it("offers play when paused, and says so when the connection is gone", () => {
    const { rerender } = render(<RadioMiniPlayer station={stations[1]} status="paused" onToggle={() => {}} onStop={() => {}} />);
    expect(screen.getByRole("button", { name: "Play Mishary Alafasi" })).toBeInTheDocument();
    rerender(<RadioMiniPlayer station={stations[1]} status="offline" onToggle={() => {}} onStop={() => {}} />);
    expect(screen.getByRole("status")).toHaveTextContent("The radio needs an internet connection.");
  });

  it("is in Arabic with the station's Arabic name", () => {
    render(
      <LanguageProvider language="ar" onLanguageChange={() => {}}>
        <RadioMiniPlayer station={stations[1]} status="playing" onToggle={() => {}} onStop={() => {}} />
      </LanguageProvider>,
    );
    const region = screen.getByRole("region", { name: "يعمل الآن" });
    expect(region).toHaveAttribute("dir", "rtl");
    expect(within(region).getByText("مشاري العفاسي")).toBeInTheDocument();
    expect(within(region).getByRole("button", { name: "إيقاف مؤقت" })).toBeInTheDocument();
  });
});
