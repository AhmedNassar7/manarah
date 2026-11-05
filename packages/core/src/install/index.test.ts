import { describe, expect, it } from "vitest";
import { installPlatform, installPlatformOrder } from "./index.js";

const UA = {
  iphone: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
  iphoneChrome: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/123.0 Mobile/15E148 Safari/604.1",
  ipad: "Mozilla/5.0 (iPad; CPU OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
  ipadAsMac: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
  androidChrome: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Mobile Safari/537.36",
  androidSamsung: "Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36",
  windowsChrome: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
  windowsEdge: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0",
  macChrome: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
  linuxFirefox: "Mozilla/5.0 (X11; Linux x86_64; rv:124.0) Gecko/20100101 Firefox/124.0",
};

describe("installPlatform", () => {
  it("recognises an iPhone or iPad, in Safari or in another browser (they all install from the Share menu)", () => {
    expect(installPlatform(UA.iphone)).toBe("ios");
    expect(installPlatform(UA.iphoneChrome)).toBe("ios");
    expect(installPlatform(UA.ipad)).toBe("ios");
  });

  it("recognises a newer iPad, which calls itself a Mac — but only because it has a touch screen", () => {
    expect(installPlatform(UA.ipadAsMac, 5)).toBe("ios");
    expect(installPlatform(UA.ipadAsMac, 0)).toBe("desktop"); // a real Mac
    expect(installPlatform(UA.macChrome, 0)).toBe("desktop");
  });

  it("recognises Android phones whatever the browser", () => {
    expect(installPlatform(UA.androidChrome, 5)).toBe("android");
    expect(installPlatform(UA.androidSamsung, 5)).toBe("android");
  });

  it("treats everything else as a computer", () => {
    for (const ua of [UA.windowsChrome, UA.windowsEdge, UA.linuxFirefox]) expect(installPlatform(ua)).toBe("desktop");
    expect(installPlatform("")).toBe("desktop");
  });

  it("is not fooled by letter case", () => {
    expect(installPlatform(UA.iphone.toUpperCase())).toBe("ios");
    expect(installPlatform(UA.androidChrome.toUpperCase())).toBe("android");
  });
});

describe("installPlatformOrder", () => {
  it("puts this device's instructions first and still lists the others", () => {
    expect(installPlatformOrder("ios")).toEqual(["ios", "android", "desktop"]);
    expect(installPlatformOrder("android")).toEqual(["android", "ios", "desktop"]);
    expect(installPlatformOrder("desktop")).toEqual(["desktop", "ios", "android"]);
  });
});
