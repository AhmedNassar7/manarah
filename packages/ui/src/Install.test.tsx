import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "./i18n/index.js";
import { InstallBanner, InstallButton, InstallGuide } from "./Install.js";

const base = { canPrompt: false, installed: false, onInstall: () => {} };

describe("InstallGuide", () => {
  it("says what installing gives you, and that there is nothing to download from a store", () => {
    render(<InstallGuide platform="android" {...base} />);
    expect(screen.getByText(/its own icon, full screen/)).toBeInTheDocument();
    expect(screen.getByText(/nothing to download from a store/)).toBeInTheDocument();
  });

  it("shows this device's steps first, in order, and the other devices' behind 'Other devices'", () => {
    render(<InstallGuide platform="ios" {...base} />);
    const headings = screen.getAllByRole("heading", { level: 4 }).map((h) => h.textContent);
    expect(headings).toEqual(["iPhone or iPad", "Android phone", "Computer (Chrome or Edge)"]);
    const first = screen.getAllByRole("heading", { level: 4 })[0].closest("section")!;
    expect(within(first).getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      "Open this page in Safari and tap the Share button (the square with an arrow).",
      "Scroll down and choose “Add to Home Screen”.",
      "Tap “Add”. Manarah now has its own icon.",
    ]);
    const others = document.querySelector("details.install-others")!;
    expect(others).not.toHaveAttribute("open");
    expect(within(others as HTMLElement).getByText("Android phone")).toBeInTheDocument();
    expect(within(others as HTMLElement).queryByText("iPhone or iPad")).not.toBeInTheDocument();
  });

  it("starts with Android's steps on Android, and the computer's on a computer", () => {
    const { unmount } = render(<InstallGuide platform="android" {...base} />);
    expect(screen.getAllByRole("heading", { level: 4 })[0]).toHaveTextContent("Android phone");
    unmount();
    render(<InstallGuide platform="desktop" {...base} />);
    expect(screen.getAllByRole("heading", { level: 4 })[0]).toHaveTextContent("Computer (Chrome or Edge)");
    expect(screen.getByText(/Firefox can't install web apps/)).toBeInTheDocument();
  });

  it("offers an Install now button only where the browser can start the install", () => {
    const onInstall = vi.fn();
    const { rerender } = render(<InstallGuide platform="android" {...base} onInstall={onInstall} />);
    expect(screen.queryByRole("button", { name: /Install now/ })).not.toBeInTheDocument();
    rerender(<InstallGuide platform="android" {...base} canPrompt onInstall={onInstall} />);
    fireEvent.click(screen.getByRole("button", { name: /Install now/ }));
    expect(onInstall).toHaveBeenCalledTimes(1);
  });

  it("just says so when it is already installed, with no steps", () => {
    render(<InstallGuide platform="ios" {...base} installed />);
    expect(screen.getByText("Manarah is installed on this device.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 4 })).not.toBeInTheDocument();
  });

  it("is in Arabic, right to left, with the steps in Arabic", () => {
    render(
      <LanguageProvider language="ar" onLanguageChange={() => {}}>
        <InstallGuide platform="ios" {...base} />
      </LanguageProvider>,
    );
    expect(screen.getAllByRole("heading", { level: 4 })[0]).toHaveTextContent("آيفون أو آيباد");
    expect(screen.getByText("اختر «إضافة إلى الشاشة الرئيسية».".replace("اختر", "مرّر للأسفل واختر"))).toBeInTheDocument();
    expect(document.querySelector(".install-guide")).toHaveAttribute("dir", "rtl");
    expect(screen.queryByText(/Add to Home Screen/)).not.toBeInTheDocument();
  });
});

describe("InstallButton", () => {
  it("is not there once installed", () => {
    const { container } = render(<InstallButton platform="android" {...base} installed canPrompt />);
    expect(container).toBeEmptyDOMElement();
  });

  it("is not there on a computer browser that cannot install (the Settings guide still explains)", () => {
    const { container } = render(<InstallButton platform="desktop" {...base} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("starts the browser's own install straight away when it can — no dialog in between", () => {
    const onInstall = vi.fn();
    render(<InstallButton platform="desktop" {...base} canPrompt onInstall={onInstall} />);
    fireEvent.click(screen.getByRole("button", { name: "Install" }));
    expect(onInstall).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("on an iPhone, where the page cannot start it, opens the steps", () => {
    render(<InstallButton platform="ios" {...base} />);
    fireEvent.click(screen.getByRole("button", { name: "Install" }));
    const dialog = screen.getByRole("dialog", { name: "Install Manarah" });
    expect(within(dialog).getAllByRole("heading", { level: 4 })[0]).toHaveTextContent("iPhone or iPad");
    expect(within(dialog).queryByRole("button", { name: /Install now/ })).not.toBeInTheDocument();
  });

  it("is offered on an Android browser that has not offered to install, and shows the steps", () => {
    render(<InstallButton platform="android" {...base} />);
    fireEvent.click(screen.getByRole("button", { name: "Install" }));
    expect(within(screen.getByRole("dialog")).getAllByRole("heading", { level: 4 })[0]).toHaveTextContent("Android phone");
  });

  it("closes the steps with Escape or the close button, and gives focus back to the button", async () => {
    render(<InstallButton platform="ios" {...base} />);
    const button = screen.getByRole("button", { name: "Install" });
    fireEvent.click(button);
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(button).toHaveFocus());
    fireEvent.click(button);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("has an Arabic label", () => {
    render(
      <LanguageProvider language="ar" onLanguageChange={() => {}}>
        <InstallButton platform="ios" {...base} />
      </LanguageProvider>,
    );
    expect(screen.getByRole("button", { name: "تثبيت" })).toBeInTheDocument();
  });
});

describe("InstallBanner", () => {
  const props = { platform: "android" as const, canPrompt: true, onInstall: () => {}, onDismiss: () => {} };

  it("says what installing gives, in a labelled region that does not trap focus", () => {
    render(<InstallBanner {...props} />);
    const region = screen.getByRole("region", { name: "Install Manarah" });
    expect(within(region).getByText(/Its own icon, opens full screen/)).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(region).not.toContainElement(document.activeElement as HTMLElement);
  });

  it("where the browser can install, the main button starts it straight away", () => {
    const onInstall = vi.fn();
    render(<InstallBanner {...props} onInstall={onInstall} />);
    fireEvent.click(screen.getByRole("button", { name: "Install" }));
    expect(onInstall).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("where it cannot (an iPhone), the main button shows the steps, and closing them counts as seen", () => {
    const onDismiss = vi.fn();
    render(<InstallBanner {...props} platform="ios" canPrompt={false} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole("button", { name: "Show me how" }));
    const dialog = screen.getByRole("dialog", { name: "Install Manarah" });
    expect(within(dialog).getAllByRole("heading", { level: 4 })[0]).toHaveTextContent("iPhone or iPad");
    expect(onDismiss).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Close" }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("'Not now' dismisses", () => {
    const onDismiss = vi.fn();
    render(<InstallBanner {...props} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole("button", { name: "Not now" }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("is in Arabic, right to left", () => {
    render(
      <LanguageProvider language="ar" onLanguageChange={() => {}}>
        <InstallBanner {...props} />
      </LanguageProvider>,
    );
    const region = screen.getByRole("region", { name: "ثبّت منارة" });
    expect(region).toHaveAttribute("dir", "rtl");
    expect(within(region).getByRole("button", { name: "تثبيت" })).toBeInTheDocument();
    expect(within(region).getByRole("button", { name: "ليس الآن" })).toBeInTheDocument();
    expect(within(region).queryByText(/Install|Not now/)).not.toBeInTheDocument();
  });
});
