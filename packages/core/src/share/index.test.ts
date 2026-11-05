import { describe, expect, it } from "vitest";
import { buildShareMessage, shareLinks } from "./index.js";

const url = "https://example.com/manarah/";

describe("buildShareMessage", () => {
  it("is in English for English and Arabic for Arabic, and always carries the link", () => {
    const en = buildShareMessage("en", url);
    const ar = buildShareMessage("ar", url);
    expect(en.title).toBe("Manarah");
    expect(en.text).toMatch(/prayer times/);
    expect(ar.title).toBe("منارة");
    expect(ar.text).toMatch(/مواقيت الصلاة/);
    expect(en.full).toContain(url);
    expect(ar.full).toContain(url);
    expect(en.full).toBe(`${en.text}\n${url}`);
  });

  it("keeps the Arabic message free of English and the English one free of Arabic", () => {
    expect(buildShareMessage("ar", url).text).not.toMatch(/[A-Za-z]/);
    expect(buildShareMessage("en", url).text).not.toMatch(/[؀-ۿ]/);
  });

  it("does not claim more than the app does: no 'works offline' without 'most of'", () => {
    expect(buildShareMessage("en", url).text).toContain("most of it works offline");
    expect(buildShareMessage("ar", url).text).toContain("ومعظمه يعمل بدون إنترنت");
  });
});

describe("shareLinks", () => {
  const message = buildShareMessage("en", url);
  const links = shareLinks(message);

  it("builds a WhatsApp link carrying the message and link", () => {
    expect(links.whatsapp.startsWith("https://wa.me/?text=")).toBe(true);
    expect(decodeURIComponent(links.whatsapp.split("text=")[1])).toBe(message.full);
  });

  it("builds a Telegram link with the link and the text separately", () => {
    const query = new URL(links.telegram).searchParams;
    expect(query.get("url")).toBe(url);
    expect(query.get("text")).toBe(message.text);
  });

  it("builds an email with a subject and the whole message", () => {
    expect(links.email.startsWith("mailto:?subject=")).toBe(true);
    const query = new URLSearchParams(links.email.slice("mailto:?".length));
    expect(query.get("subject")).toBe("Manarah");
    expect(query.get("body")).toBe(message.full);
  });

  it("encodes Arabic text so it survives the trip", () => {
    const ar = buildShareMessage("ar", url);
    expect(decodeURIComponent(shareLinks(ar).whatsapp.split("text=")[1])).toBe(ar.full);
  });
});
