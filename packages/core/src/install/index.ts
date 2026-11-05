/**
 * Installing Manarah is "Add to Home Screen" / "Install app" — a browser feature, done a
 * different way on each kind of device. The app can only *start* the install itself
 * where the browser allows it (Chrome and Edge on Android and computers); everywhere
 * else the person has to be told which menu to use. This picks which instructions to show.
 * Pure: the user-agent string is passed in.
 */

export type InstallPlatform = "ios" | "android" | "desktop";

/**
 * Which kind of device this is. iPadOS 13+ reports itself as a Mac, so a "Mac" with a touch
 * screen is an iPad.
 */
export function installPlatform(userAgent: string, maxTouchPoints = 0): InstallPlatform {
  const ua = userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (ua.includes("macintosh") && maxTouchPoints > 1) return "ios";
  if (ua.includes("android")) return "android";
  return "desktop";
}

/** The order to show the instructions in: this device's own first, then the others. */
export function installPlatformOrder(platform: InstallPlatform): InstallPlatform[] {
  const all: InstallPlatform[] = ["ios", "android", "desktop"];
  return [platform, ...all.filter((p) => p !== platform)];
}
