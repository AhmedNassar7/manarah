/** Localized country name for an ISO code ("EG" → "Egypt" / "مصر"), falling back to the code itself. */
export function countryName(code: string, language: string): string {
  try {
    return new Intl.DisplayNames([language], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

/** "Cairo, Egypt" / "القاهرة، مصر": the city in the interface language (Arabic where GeoNames has a name), then its country. */
export function placeLabel(place: { name: string; nameAr?: string; countryCode?: string }, language: string): string {
  const city = language === "ar" ? place.nameAr || place.name : place.name;
  if (!place.countryCode) return city;
  return `${city}${language === "ar" ? "، " : ", "}${countryName(place.countryCode, language)}`;
}
