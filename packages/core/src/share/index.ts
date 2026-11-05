/**
 * What gets sent when someone shares Manarah with a friend: a short message in
 * their language, and ready-made links for the common ways to send it. Pure.
 * Nothing is collected — sharing opens the other app (or copies the link) and
 * that is all.
 */

export interface ShareMessage {
  title: string;
  /** The message without the link. */
  text: string;
  url: string;
  /** Message and link together, for places that take one string. */
  full: string;
}

export function buildShareMessage(language: string, url: string): ShareMessage {
  const ar = language === "ar";
  const title = ar ? "منارة" : "Manarah";
  const text = ar
    ? "منارة — مواقيت الصلاة والقبلة والقرآن والأذكار والحديث في تطبيق واحد مجاني. بدون إعلانات وبدون حساب، ومعظمه يعمل بدون إنترنت."
    : "Manarah — prayer times, Qibla, Qur'an, adhkar and hadith in one free app. No ads, no account, and most of it works offline.";
  return { title, text, url, full: `${text}\n${url}` };
}

export interface ShareLinks {
  whatsapp: string;
  telegram: string;
  email: string;
}

export function shareLinks(message: ShareMessage): ShareLinks {
  const enc = encodeURIComponent;
  return {
    whatsapp: `https://wa.me/?text=${enc(message.full)}`,
    telegram: `https://t.me/share/url?url=${enc(message.url)}&text=${enc(message.text)}`,
    email: `mailto:?subject=${enc(message.title)}&body=${enc(message.full)}`,
  };
}
