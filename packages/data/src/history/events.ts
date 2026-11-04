import type { HistoricalEvent } from "@manarah/core";

/**
 * Events in Islamic history, by the day they are remembered.
 *
 * Only well-known events with a recorded date. Where the early sources give
 * different days, the event is marked "traditional" — the commonly given
 * date, not a settled one — and its note says so; nothing disputed is
 * presented as fact. Titles and notes are in English and Arabic.
 *
 * Events are pinned to their HIJRI day only. Western sources give the
 * Gregorian date of events before 1582 in the Julian calendar, which differs
 * from today's Gregorian calendar by 6-9 days in those centuries (checked:
 * Jerusalem 1187, Ain Jalut 1260 and Constantinople 1453 all came out 7-9 days
 * off when read as Gregorian) — so a Gregorian "on this day" for them would be
 * wrong. The CE year in a title is right under either calendar.
 */
export const HISTORICAL_EVENTS: HistoricalEvent[] = [
  {
    id: "ashura",
    hijri: { month: 1, day: 10 },
    confidence: "established",
    title: { en: "Day of Ashura", ar: "يوم عاشوراء" },
    note: {
      en: "On this day Allah saved Musa and his people from Pharaoh. The Prophet ﷺ fasted it and encouraged fasting it (reported in Sahih al-Bukhari and Sahih Muslim).",
      ar: "في هذا اليوم نجّى الله موسى عليه السلام وقومه من فرعون. وصامه النبي ﷺ وحثّ على صيامه (رواه البخاري ومسلم).",
    },
  },
  {
    id: "karbala",
    hijri: { month: 1, day: 10, year: 61 },
    confidence: "established",
    title: { en: "Martyrdom of al-Husayn at Karbala (61 AH)", ar: "استشهاد الحسين بن علي في كربلاء (61هـ)" },
    note: {
      en: "Al-Husayn ibn Ali, grandson of the Prophet ﷺ, was killed at Karbala in Iraq.",
      ar: "قُتل الحسين بن علي، سبط رسول الله ﷺ، في كربلاء بالعراق.",
    },
  },
  {
    id: "prophet-birth",
    hijri: { month: 3, day: 12 },
    confidence: "traditional",
    title: { en: "Birth of the Prophet ﷺ (traditional date)", ar: "مولد النبي ﷺ (التاريخ المشهور)" },
    note: {
      en: "Commonly given as Monday 12 Rabi' al-Awwal in the Year of the Elephant (about 570 CE). Scholars differ on the exact day; some say the 8th or 9th.",
      ar: "المشهور أنه يوم الاثنين 12 ربيع الأول عام الفيل (نحو 570م). ويختلف العلماء في تحديد اليوم؛ فقيل الثامن أو التاسع.",
    },
  },
  {
    id: "prophet-passing",
    hijri: { month: 3, day: 12, year: 11 },
    confidence: "traditional",
    title: { en: "Passing of the Prophet ﷺ (11 AH)", ar: "وفاة النبي ﷺ (11هـ)" },
    note: {
      en: "Commonly reported as Monday 12 Rabi' al-Awwal, 11 AH, in Madinah.",
      ar: "المشهور أنها يوم الاثنين 12 ربيع الأول سنة 11هـ في المدينة المنورة.",
    },
  },
  {
    id: "isra-miraj",
    hijri: { month: 7, day: 27 },
    confidence: "traditional",
    title: { en: "Al-Isra' wal-Mi'raj (traditional date)", ar: "الإسراء والمعراج (التاريخ المشهور)" },
    note: {
      en: "The Prophet's ﷺ night journey to Jerusalem and ascension is commonly remembered on 27 Rajab. Scholars differ on the date, and no special observance of it is established.",
      ar: "تُذكر رحلة الإسراء والمعراج في 27 رجب عند كثيرين. وللعلماء خلاف في تاريخها، ولم يثبت تخصيصها بعبادة.",
    },
  },
  {
    id: "jerusalem-1187",
    hijri: { month: 7, day: 27, year: 583 },
    confidence: "established",
    title: { en: "Salah al-Din retakes Jerusalem (583 AH / 1187)", ar: "استرداد صلاح الدين للقدس (583هـ / 1187م)" },
    note: {
      en: "After the Battle of Hattin, Salah al-Din (Saladin) recaptured Jerusalem from the Crusaders.",
      ar: "بعد معركة حطين استرد صلاح الدين الأيوبي القدس من الصليبيين.",
    },
  },
  {
    id: "qibla-change",
    hijri: { month: 8, day: 15, year: 2 },
    confidence: "traditional",
    title: { en: "Change of the qibla (2 AH)", ar: "تحويل القبلة (2هـ)" },
    note: {
      en: "In mid-Sha'ban the direction of prayer was changed from Jerusalem to the Ka'bah in Makkah (Qur'an 2:144). The exact day is reported differently.",
      ar: "في منتصف شعبان حُوّلت القبلة من بيت المقدس إلى الكعبة المشرفة (البقرة: 144). وتاريخ اليوم بدقة مروي بأقوال مختلفة.",
    },
  },
  {
    id: "badr",
    hijri: { month: 9, day: 17, year: 2 },
    confidence: "established",
    title: { en: "Battle of Badr (2 AH)", ar: "غزوة بدر الكبرى (2هـ)" },
    note: {
      en: "The first major battle of Islam, on 17 Ramadan 2 AH: about 313 Muslims met a Quraysh army of about 1,000 near Badr.",
      ar: "أول معركة فاصلة في الإسلام، في 17 رمضان سنة 2هـ: التقى فيها نحو 313 مسلمًا بجيش قريش البالغ نحو ألف مقاتل قرب بدر.",
    },
  },
  {
    id: "makkah-conquest",
    hijri: { month: 9, day: 20, year: 8 },
    confidence: "traditional",
    title: { en: "Conquest of Makkah (8 AH)", ar: "فتح مكة (8هـ)" },
    note: {
      en: "The Prophet ﷺ entered Makkah with his army and the city submitted without a major fight. Reported as 20 Ramadan; some narrations give a different day.",
      ar: "دخل النبي ﷺ مكة بجيشه واستسلمت المدينة دون قتال كبير. المشهور 20 رمضان، وفي الروايات خلاف في اليوم.",
    },
  },
  {
    id: "ali-passing",
    hijri: { month: 9, day: 21, year: 40 },
    confidence: "established",
    title: { en: "Passing of Ali ibn Abi Talib (40 AH)", ar: "وفاة علي بن أبي طالب (40هـ)" },
    note: {
      en: "The fourth rightly-guided caliph died of a wound inflicted by an assassin in Kufa; reported as 21 Ramadan.",
      ar: "توفي الخليفة الراشد الرابع متأثرًا بجرح أصابه من قاتل في الكوفة؛ المشهور 21 رمضان.",
    },
  },
  {
    id: "ain-jalut",
    hijri: { month: 9, day: 25, year: 658 },
    confidence: "established",
    title: { en: "Battle of Ain Jalut (658 AH / 1260)", ar: "معركة عين جالوت (658هـ / 1260م)" },
    note: {
      en: "The Mamluks under Qutuz and Baybars defeated the Mongol army in Palestine and halted its advance.",
      ar: "هزم المماليك بقيادة قطز وبيبرس الجيش المغولي في فلسطين وأوقفوا زحفه.",
    },
  },
  {
    id: "uhud",
    hijri: { month: 10, day: 7, year: 3 },
    confidence: "traditional",
    title: { en: "Battle of Uhud (3 AH)", ar: "غزوة أحد (3هـ)" },
    note: {
      en: "Fought near Madinah; reported as 7 Shawwal 3 AH (one account says the 15th).",
      ar: "وقعت قرب المدينة المنورة، والمشهور 7 شوال سنة 3هـ (وفي رواية 15 شوال).",
    },
  },
  {
    id: "farewell-sermon",
    hijri: { month: 12, day: 9, year: 10 },
    confidence: "established",
    title: { en: "The Farewell Sermon at Arafah (10 AH)", ar: "خطبة الوداع في عرفة (10هـ)" },
    note: {
      en: "On Friday 9 Dhu al-Hijjah 10 AH the Prophet ﷺ gave his Farewell Sermon, and the verse \"This day I have perfected for you your religion\" (5:3) was revealed.",
      ar: "في يوم الجمعة 9 ذي الحجة سنة 10هـ ألقى النبي ﷺ خطبة الوداع، ونزلت الآية: ﴿الْيَوْمَ أَكْمَلْتُ لَكُمْ دِينَكُمْ﴾ (المائدة: 3).",
    },
  },
  {
    id: "uthman-martyrdom",
    hijri: { month: 12, day: 18, year: 35 },
    confidence: "established",
    title: { en: "Martyrdom of Uthman ibn Affan (35 AH)", ar: "استشهاد عثمان بن عفان (35هـ)" },
    note: {
      en: "The third rightly-guided caliph was killed in Madinah; reported as 18 Dhu al-Hijjah.",
      ar: "قُتل الخليفة الراشد الثالث في المدينة المنورة؛ المشهور 18 ذي الحجة.",
    },
  },
  {
    id: "umar-stabbed",
    hijri: { month: 12, day: 26, year: 23 },
    confidence: "established",
    title: { en: "Umar ibn al-Khattab is struck down (23 AH)", ar: "طعن عمر بن الخطاب (23هـ)" },
    note: {
      en: "The second caliph was stabbed while leading the dawn prayer, reported as 26 Dhu al-Hijjah, and died a few days later.",
      ar: "طُعن الخليفة الثاني وهو يصلي الفجر، والمشهور 26 ذي الحجة، وتوفي بعد أيام.",
    },
  },
  {
    id: "constantinople-1453",
    hijri: { month: 5, day: 20, year: 857 },
    confidence: "established",
    title: { en: "Fall of Constantinople (857 AH / 1453)", ar: "فتح القسطنطينية (857هـ / 1453م)" },
    note: {
      en: "The Ottoman sultan Mehmed II conquered Constantinople, ending the Byzantine Empire.",
      ar: "فتح السلطان العثماني محمد الفاتح القسطنطينية، وانتهت بذلك الإمبراطورية البيزنطية.",
    },
  },
];
