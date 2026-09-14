import type { CalculationMethodId } from "@quran-companion/core";

export interface CalculationMethodOption {
  id: CalculationMethodId;
  label: string;
}

/** Maps 1:1 to adhan.js's CalculationMethod presets. */
export const CALCULATION_METHODS: CalculationMethodOption[] = [
  { id: "MuslimWorldLeague", label: "Muslim World League" },
  { id: "Egyptian", label: "Egyptian General Authority of Survey" },
  { id: "Karachi", label: "University of Islamic Sciences, Karachi" },
  { id: "UmmAlQura", label: "Umm al-Qura University, Makkah" },
  { id: "Dubai", label: "Dubai (UAE)" },
  { id: "MoonsightingCommittee", label: "Moonsighting Committee Worldwide" },
  { id: "NorthAmerica", label: "Islamic Society of North America (ISNA)" },
  { id: "Kuwait", label: "Kuwait" },
  { id: "Qatar", label: "Qatar" },
  { id: "Singapore", label: "Majlis Ugama Islam Singapura" },
  { id: "Tehran", label: "Institute of Geophysics, University of Tehran" },
  { id: "Turkey", label: "Diyanet İşleri Başkanlığı, Turkey" },
];
