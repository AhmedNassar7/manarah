import { qiblaBearing, qiblaDistanceKm, type Coordinates } from "@manarah/core";
import { LocationSummary, QiblaFinder, useTranslation, type LocationSummaryProps } from "@manarah/ui";

export interface QiblaPageProps {
  locationSummary: LocationSummaryProps;
  coordinates: Coordinates | undefined;
  heading: number | undefined;
  /** Present only where the live compass needs an explicit permission tap (iOS). */
  onEnableLiveCompass?: () => void;
}

export function QiblaPage({ locationSummary, coordinates, heading, onEnableLiveCompass }: QiblaPageProps) {
  const { t } = useTranslation();

  return (
    <>
      <h2 className="section-title">{t("app.sectionQibla")}</h2>
      <div className="qibla-page">
        <LocationSummary {...locationSummary} />
        {coordinates && (
          <QiblaFinder
            bearing={qiblaBearing(coordinates)}
            distanceKm={qiblaDistanceKm(coordinates)}
            heading={heading}
            onEnableLiveCompass={onEnableLiveCompass}
          />
        )}
      </div>
    </>
  );
}
