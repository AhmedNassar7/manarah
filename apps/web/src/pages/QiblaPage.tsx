import { qiblaBearing, qiblaDistanceKm, type Coordinates } from "@manarah/core";
import { QiblaCompass, useTranslation } from "@manarah/ui";
import { LocationPrompt } from "../LocationPrompt.js";

export interface QiblaPageProps {
  coordinates: Coordinates | undefined;
  heading: number | undefined;
}

export function QiblaPage({ coordinates, heading }: QiblaPageProps) {
  const { t } = useTranslation();

  if (!coordinates) return <LocationPrompt />;

  return (
    <>
      <h2 className="section-title">{t("app.sectionQibla")}</h2>
      <div className="qibla-page">
        <QiblaCompass bearing={qiblaBearing(coordinates)} distanceKm={qiblaDistanceKm(coordinates)} heading={heading} />
      </div>
    </>
  );
}
