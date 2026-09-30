import type { AzkarSection } from "@manarah/core";

/**
 * Hisn al-Muslim's 132 categories grouped into themed sections for browsing
 * — the upstream data has no grouping of its own, and its per-category
 * `trigger` puts 124 of 132 under "situational", which is too coarse to
 * navigate. Grouping follows the book's own chapter order where it can.
 * Every category with content appears in exactly one section (enforced by
 * the data-integrity test). Category 132 ("types of goodness") has no items
 * upstream, so it's left out rather than shown empty.
 *
 * Section titles live in the UI dictionaries (`azkarSection.<id>`).
 */
export const AZKAR_SECTIONS: AzkarSection[] = [
  { id: "morning-evening", icon: "🌅", categoryIds: ["27"] },
  { id: "sleep", icon: "🌙", categoryIds: ["28", "29", "30", "31", "1"] },
  {
    id: "prayer",
    icon: "🕌",
    categoryIds: ["15", "16", "17", "18", "19", "20", "21", "22", "23", "24", "25", "32", "33", "42", "26"],
  },
  { id: "purification-mosque", icon: "💧", categoryIds: ["6", "7", "8", "9", "12", "13", "14"] },
  { id: "home-dress", icon: "🏠", categoryIds: ["10", "11", "2", "3", "4", "5"] },
  { id: "food-fasting", icon: "🍽️", categoryIds: ["69", "70", "71", "72", "68", "73", "74", "75", "76"] },
  {
    id: "travel",
    icon: "🧳",
    categoryIds: ["95", "96", "97", "98", "99", "100", "101", "102", "103", "104", "105"],
  },
  {
    id: "hardship",
    icon: "🤲",
    categoryIds: [
      "34",
      "35",
      "36",
      "37",
      "38",
      "39",
      "40",
      "41",
      "43",
      "44",
      "45",
      "46",
      "122",
      "124",
      "125",
      "126",
      "128",
      "88",
      "92",
      "94",
    ],
  },
  {
    id: "illness-death",
    icon: "🕊️",
    categoryIds: ["49", "50", "51", "52", "53", "54", "55", "56", "57", "58", "59", "60"],
  },
  { id: "nature", icon: "🌧️", categoryIds: ["61", "62", "63", "64", "65", "66", "67", "110", "111"] },
  {
    id: "social",
    icon: "🤝",
    categoryIds: [
      "108",
      "109",
      "77",
      "78",
      "82",
      "83",
      "84",
      "85",
      "86",
      "87",
      "89",
      "90",
      "91",
      "93",
      "106",
      "112",
      "113",
      "114",
      "123",
      "47",
      "48",
      "79",
      "80",
      "81",
    ],
  },
  { id: "hajj", icon: "🕋", categoryIds: ["115", "116", "117", "118", "119", "120", "121", "127"] },
  { id: "dhikr-forgiveness", icon: "📿", categoryIds: ["129", "130", "131", "107"] },
];
