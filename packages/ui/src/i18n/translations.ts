import type { Language } from "@manarah/core";

export type { Language };

export interface TranslationVars {
  [key: string]: string | number;
}

type Dictionary = Record<string, string>;

/**
 * English is the fallback dictionary — every key must exist here. Arabic
 * may be missing a key during development without breaking anything;
 * `translate()` falls back to English (and then to the raw key) so a
 * missing translation degrades gracefully instead of rendering nothing.
 */
const EN: Dictionary = {
  "app.tagline": "Prayer, azkar, Qur'an, and Qibla",
  "app.geolocationUnavailable": "Geolocation is not available in this browser.",
  "app.sectionHome": "Home",
  "app.sectionPrayer": "Prayer",
  "app.sectionPrayerSettings": "Prayer settings",
  "app.sectionQibla": "Qibla",
  "app.sectionQuran": "Quran",
  "app.sectionAzkar": "Azkar",
  "app.sectionAzkarSettings": "Azkar settings",
  "app.viewAll": "View all →",
  "app.locationNeeded": "Set your location on the Home page to see this.",
  "app.goHome": "Go to Home",

  "notifications.enablePrompt": "Enable notifications to get prayer and azkar reminders while this tab is open.",
  "notifications.enableButton": "Enable notifications",

  "citySearch.placeholderDefault": "Search for a city…",
  "citySearch.placeholderManual": "Set location manually…",
  "citySearch.placeholderPopupFallback": "Set your city instead…",
  "citySearch.noResults": "No matching cities",
  "citySearch.ariaLabel": "City search",

  "prayer.next": "Next prayer",
  "prayer.todaysPrayers": "Today's prayers",
  "prayer.noMoreToday": "No more prayers today",
  "prayer.name.Fajr": "Fajr",
  "prayer.name.Sunrise": "Sunrise",
  "prayer.name.Dhuhr": "Dhuhr",
  "prayer.name.Asr": "Asr",
  "prayer.name.Maghrib": "Maghrib",
  "prayer.name.Isha": "Isha",

  "qibla.fromNorth": "{deg}° from North",
  "qibla.toKaaba": "{distance} to the Kaaba",
  "qibla.distanceUnit": "km",
  "qibla.ariaBearing": "Qibla direction: {deg} degrees from north",
  "qibla.ariaLocked": "Qibla direction: locked onto the Kaaba",
  "qibla.ariaRelative": "Qibla direction relative to your current heading",

  "quran.revelation.Meccan": "Meccan",
  "quran.revelation.Medinan": "Medinan",
  "quranReader.loadMore": "Load more — {shown} of {total} verses",
  "quranReader.showTranslation": "Show translation",
  "quranReader.hideTranslation": "Hide translation",

  "quranNavigator.open": "Browse Quran",
  "quranNavigator.close": "Close",
  "quranNavigator.tab.surah": "Surah",
  "quranNavigator.tab.ayah": "Ayah",
  "quranNavigator.tab.juz": "Juz'",
  "quranNavigator.tab.page": "Page",
  "quranNavigator.searchPlaceholder.surah": "Search for a surah…",
  "quranNavigator.searchPlaceholder.ayah": "Search for an ayah…",
  "quranNavigator.searchPlaceholder.juz": "Search for a juz'…",
  "quranNavigator.searchPlaceholder.page": "Search for a page…",
  "quranNavigator.juzLabel": "Juz' {n}",
  "quranNavigator.pageLabel": "Page {n}",
  "quranNavigator.noResults": "No matches",

  "popup.continueReading": "Continue reading",
  "popup.continueReadingHint": "Pick up right where you left off in the Quran reader.",

  "azkarSchedule.headerCategory": "Category",
  "azkarSchedule.headerMuted": "Muted",
  "azkarSchedule.headerTrigger": "Trigger",
  "azkarSchedule.headerCustomTime": "Custom time",
  "azkarSchedule.muteLabel": "Mute {category}",
  "azkarSchedule.triggerLabel": "Trigger for {category}",
  "azkarSchedule.customTimeLabel": "Custom time for {category}",
  "azkarSchedule.trigger.morning": "Morning",
  "azkarSchedule.trigger.evening": "Evening",
  "azkarSchedule.trigger.post-salah": "After each prayer",
  "azkarSchedule.trigger.before-sleep": "Before sleep",
  "azkarSchedule.trigger.waking": "On waking",
  "azkarSchedule.trigger.situational": "Situational",
  "azkarSchedule.trigger.custom-time": "Custom time",

  "prayerSettings.calculationMethod": "Calculation method",
  "prayerSettings.asrCalculation": "Asr calculation",
  "prayerSettings.asrStandard": "Standard (Shafi'i, Maliki, Hanbali)",
  "prayerSettings.asrHanafi": "Hanafi",

  "calculationMethod.MuslimWorldLeague": "Muslim World League",
  "calculationMethod.Egyptian": "Egyptian General Authority of Survey",
  "calculationMethod.Karachi": "University of Islamic Sciences, Karachi",
  "calculationMethod.UmmAlQura": "Umm al-Qura University, Makkah",
  "calculationMethod.Dubai": "Dubai (UAE)",
  "calculationMethod.MoonsightingCommittee": "Moonsighting Committee Worldwide",
  "calculationMethod.NorthAmerica": "Islamic Society of North America (ISNA)",
  "calculationMethod.Kuwait": "Kuwait",
  "calculationMethod.Qatar": "Qatar",
  "calculationMethod.Singapore": "Majlis Ugama Islam Singapura",
  "calculationMethod.Tehran": "Institute of Geophysics, University of Tehran",
  "calculationMethod.Turkey": "Diyanet İşleri Başkanlığı, Turkey",
};

const AR: Dictionary = {
  "app.tagline": "الصلاة والأذكار والقرآن والقبلة",
  "app.geolocationUnavailable": "خدمة تحديد الموقع غير متاحة في هذا المتصفح.",
  "app.sectionHome": "الرئيسية",
  "app.sectionPrayer": "الصلاة",
  "app.sectionPrayerSettings": "إعدادات الصلاة",
  "app.sectionQibla": "القبلة",
  "app.sectionQuran": "القرآن",
  "app.sectionAzkar": "الأذكار",
  "app.sectionAzkarSettings": "إعدادات الأذكار",
  "app.viewAll": "عرض الكل ←",
  "app.locationNeeded": "حدد موقعك من الصفحة الرئيسية لعرض هذا القسم.",
  "app.goHome": "الذهاب إلى الرئيسية",

  "notifications.enablePrompt": "فعّل الإشعارات لتصلك تذكيرات الصلاة والأذكار أثناء فتح هذا التبويب.",
  "notifications.enableButton": "تفعيل الإشعارات",

  "citySearch.placeholderDefault": "ابحث عن مدينة…",
  "citySearch.placeholderManual": "تحديد الموقع يدويًا…",
  "citySearch.placeholderPopupFallback": "اختر مدينتك بدلاً من ذلك…",
  "citySearch.noResults": "لا توجد مدن مطابقة",
  "citySearch.ariaLabel": "بحث عن مدينة",

  "prayer.next": "الصلاة القادمة",
  "prayer.todaysPrayers": "صلوات اليوم",
  "prayer.noMoreToday": "لا صلوات أخرى اليوم",
  "prayer.name.Fajr": "الفجر",
  "prayer.name.Sunrise": "الشروق",
  "prayer.name.Dhuhr": "الظهر",
  "prayer.name.Asr": "العصر",
  "prayer.name.Maghrib": "المغرب",
  "prayer.name.Isha": "العشاء",

  "qibla.fromNorth": "{deg}° من الشمال",
  "qibla.toKaaba": "{distance} إلى الكعبة",
  "qibla.distanceUnit": "كم",
  "qibla.ariaBearing": "اتجاه القبلة: {deg} درجة من الشمال",
  "qibla.ariaLocked": "اتجاه القبلة: تم القفل على اتجاه الكعبة",
  "qibla.ariaRelative": "اتجاه القبلة بالنسبة لاتجاهك الحالي",

  "quran.revelation.Meccan": "مكية",
  "quran.revelation.Medinan": "مدنية",
  "quranReader.loadMore": "تحميل المزيد — {shown} من {total} آية",
  "quranReader.showTranslation": "إظهار الترجمة",
  "quranReader.hideTranslation": "إخفاء الترجمة",

  "quranNavigator.open": "تصفح القرآن",
  "quranNavigator.close": "إغلاق",
  "quranNavigator.tab.surah": "سورة",
  "quranNavigator.tab.ayah": "آية",
  "quranNavigator.tab.juz": "جزء",
  "quranNavigator.tab.page": "صفحة",
  "quranNavigator.searchPlaceholder.surah": "ابحث عن سورة…",
  "quranNavigator.searchPlaceholder.ayah": "ابحث عن آية…",
  "quranNavigator.searchPlaceholder.juz": "ابحث عن جزء…",
  "quranNavigator.searchPlaceholder.page": "ابحث عن صفحة…",
  "quranNavigator.juzLabel": "الجزء {n}",
  "quranNavigator.pageLabel": "الصفحة {n}",
  "quranNavigator.noResults": "لا توجد نتائج",

  "popup.continueReading": "متابعة القراءة",
  "popup.continueReadingHint": "أكمل من حيث توقفت في قارئ القرآن.",

  "azkarSchedule.headerCategory": "الفئة",
  "azkarSchedule.headerMuted": "صامت",
  "azkarSchedule.headerTrigger": "المحفّز",
  "azkarSchedule.headerCustomTime": "وقت مخصص",
  "azkarSchedule.muteLabel": "كتم {category}",
  "azkarSchedule.triggerLabel": "محفّز {category}",
  "azkarSchedule.customTimeLabel": "وقت مخصص لـ {category}",
  "azkarSchedule.trigger.morning": "الصباح",
  "azkarSchedule.trigger.evening": "المساء",
  "azkarSchedule.trigger.post-salah": "بعد كل صلاة",
  "azkarSchedule.trigger.before-sleep": "قبل النوم",
  "azkarSchedule.trigger.waking": "عند الاستيقاظ",
  "azkarSchedule.trigger.situational": "حسب الموقف",
  "azkarSchedule.trigger.custom-time": "وقت مخصص",

  "prayerSettings.calculationMethod": "طريقة الحساب",
  "prayerSettings.asrCalculation": "طريقة حساب العصر",
  "prayerSettings.asrStandard": "المعيار العام (الشافعي، المالكي، الحنبلي)",
  "prayerSettings.asrHanafi": "الحنفي",

  "calculationMethod.MuslimWorldLeague": "رابطة العالم الإسلامي",
  "calculationMethod.Egyptian": "الهيئة المصرية العامة للمساحة",
  "calculationMethod.Karachi": "جامعة العلوم الإسلامية، كراتشي",
  "calculationMethod.UmmAlQura": "جامعة أم القرى، مكة المكرمة",
  "calculationMethod.Dubai": "دبي (الإمارات)",
  "calculationMethod.MoonsightingCommittee": "لجنة رؤية الهلال العالمية",
  "calculationMethod.NorthAmerica": "الجمعية الإسلامية لأمريكا الشمالية (إيسنا)",
  "calculationMethod.Kuwait": "الكويت",
  "calculationMethod.Qatar": "قطر",
  "calculationMethod.Singapore": "مجلس الشؤون الإسلامية في سنغافورة",
  "calculationMethod.Tehran": "معهد الجيوفيزياء، جامعة طهران",
  "calculationMethod.Turkey": "رئاسة الشؤون الدينية، تركيا",
};

const DICTIONARIES: Record<Language, Dictionary> = { en: EN, ar: AR };

/** Exposed for the dictionary-completeness test — not meant for app code, which should go through translate(). */
export const DICTIONARIES_FOR_TESTING = DICTIONARIES;

/** Looks up `key` in `language`'s dictionary, falling back to English and then the raw key, and substitutes any `{name}` placeholders from `vars`. */
export function translate(language: Language, key: string, vars?: TranslationVars): string {
  // `language` ultimately traces back to persisted data (UserSettings loaded
  // from storage); an unrecognized or missing value must degrade to English
  // rather than throw and take the whole render tree down with it.
  const dictionary = DICTIONARIES[language] ?? EN;
  const template = dictionary[key] ?? EN[key] ?? key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match));
}

/**
 * Arabic noun-number agreement for "verse" (آية): 1 takes the singular
 * phrase, 2 the dual, 3-10 the plural, 11+ reverts to the singular noun —
 * the standard Arabic counted-noun rule. Getting this wrong reads as
 * broken Arabic, so it's handled explicitly rather than just appending a
 * fixed word after any number.
 */
export function arabicVerseCount(count: number): string {
  if (count === 1) return "آية واحدة";
  if (count === 2) return "آيتان";
  if (count >= 3 && count <= 10) return `${count} آيات`;
  return `${count} آية`;
}

function englishVerseCount(count: number): string {
  return `${count} ${count === 1 ? "verse" : "verses"}`;
}

/** Formats a verse count with correct singular/dual/plural agreement for the given language. */
export function formatVerseCount(language: Language, count: number): string {
  return language === "ar" ? arabicVerseCount(count) : englishVerseCount(count);
}
