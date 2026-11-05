import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "./i18n/index.js";
import { SharePanel, ShareButton } from "./SharePanel.js";

const url = "https://example.com/manarah/";

function stubShare(fn: unknown) {
  Object.defineProperty(navigator, "share", { value: fn, configurable: true });
}
function stubClipboard(writeText: unknown) {
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
}

afterEach(() => {
  delete (navigator as unknown as Record<string, unknown>).share;
  delete (navigator as unknown as Record<string, unknown>).clipboard;
});

describe("SharePanel", () => {
  it("opens with the hadith that is the reason to share — in Arabic, and in English when the interface is English", () => {
    render(<SharePanel url={url} />);
    expect(screen.getByText("مَنْ دَلَّ عَلَى خَيْرٍ فَلَهُ مِثْلُ أَجْرِ فَاعِلِهِ")).toBeInTheDocument();
    expect(screen.getByText(/Whoever guides to something good/)).toBeInTheDocument();
    expect(screen.getByText("Sahih Muslim")).toBeInTheDocument();
  });

  it("links to WhatsApp, Telegram and email with the message and the address", () => {
    render(<SharePanel url={url} />);
    expect(screen.getByRole("link", { name: /WhatsApp/ })).toHaveAttribute("href", expect.stringContaining(encodeURIComponent(url)));
    expect(screen.getByRole("link", { name: /Telegram/ })).toHaveAttribute("href", expect.stringContaining("t.me/share/url"));
    expect(screen.getByRole("link", { name: /Email/ })).toHaveAttribute("href", expect.stringMatching(/^mailto:\?subject=/));
  });

  it("opens other apps in a new tab without handing them the page (noopener)", () => {
    render(<SharePanel url={url} />);
    const whatsapp = screen.getByRole("link", { name: /WhatsApp/ });
    expect(whatsapp).toHaveAttribute("target", "_blank");
    expect(whatsapp.getAttribute("rel")).toContain("noopener");
  });

  it("copies the link and says so — then goes back to 'Copy link'", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubClipboard(writeText);
    render(<SharePanel url={url} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
    expect(writeText).toHaveBeenCalledWith(url);
    expect(await screen.findByRole("button", { name: "Link copied" })).toBeInTheDocument();
  });

  it("does not fall over when the clipboard is not available", async () => {
    stubClipboard(vi.fn().mockRejectedValue(new Error("denied")));
    render(<SharePanel url={url} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Copy link" })).toBeInTheDocument());
  });

  it("offers the device's own share sheet only where there is one, and uses it with the app's message", async () => {
    const { unmount } = render(<SharePanel url={url} />);
    expect(screen.queryByRole("button", { name: "Share…" })).not.toBeInTheDocument();
    unmount();
    const share = vi.fn().mockResolvedValue(undefined);
    stubShare(share);
    render(<SharePanel url={url} />);
    fireEvent.click(screen.getByRole("button", { name: "Share…" }));
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ title: "Manarah", url }));
    expect(share.mock.calls[0][0].text).toMatch(/prayer times/);
  });

  it("ignores a cancelled share sheet", async () => {
    stubShare(vi.fn().mockRejectedValue(new DOMException("cancelled", "AbortError")));
    render(<SharePanel url={url} />);
    fireEvent.click(screen.getByRole("button", { name: "Share…" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Share…" })).toBeInTheDocument());
  });

  it("says it all in Arabic, with the Arabic message and no English translation of the hadith", () => {
    stubShare(vi.fn());
    render(
      <LanguageProvider language="ar" onLanguageChange={() => {}}>
        <SharePanel url={url} />
      </LanguageProvider>,
    );
    expect(screen.getByRole("link", { name: /واتساب/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "نسخ الرابط" })).toBeInTheDocument();
    expect(screen.getByText("صحيح مسلم")).toBeInTheDocument();
    expect(screen.queryByText(/Whoever guides/)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /واتساب/ }).getAttribute("href")).toContain(encodeURIComponent("منارة"));
  });

  it("says that nothing is collected", () => {
    render(<SharePanel url={url} />);
    expect(screen.getByText(/Nothing is sent to us/)).toBeInTheDocument();
  });
});

describe("ShareButton", () => {
  it("opens the device's share sheet straight away where there is one, with no dialog", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    stubShare(share);
    render(<ShareButton url={url} />);
    fireEvent.click(screen.getByRole("button", { name: "Share" }));
    await waitFor(() => expect(share).toHaveBeenCalledWith(expect.objectContaining({ url })));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("otherwise opens a dialog with the options, closes with Escape, the close button or a click outside", async () => {
    render(<ShareButton url={url} />);
    const opener = screen.getByRole("button", { name: "Share" });
    fireEvent.click(opener);
    const dialog = screen.getByRole("dialog", { name: "Share Manarah" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByRole("link", { name: /WhatsApp/ })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    fireEvent.click(opener);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(opener);
    fireEvent.click(document.querySelector(".share-backdrop")!);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not close when the dialog itself is clicked", () => {
    render(<ShareButton url={url} />);
    fireEvent.click(screen.getByRole("button", { name: "Share" }));
    fireEvent.click(screen.getByRole("dialog"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("puts the focus back on the button when the dialog closes", async () => {
    render(<ShareButton url={url} />);
    const opener = screen.getByRole("button", { name: "Share" });
    fireEvent.click(opener);
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(opener).toHaveFocus());
  });
});
