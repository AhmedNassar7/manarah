import { HADITH_COLLECTIONS, getHadithSections } from "@manarah/data";
import { HadithBrowser, useTranslation } from "@manarah/ui";
import { loadHadithSection } from "../hadith-api.js";

export interface HadithPageProps {
  showTranslation: boolean;
  onShowTranslationChange: (show: boolean) => void;
}

/** The hadith library route — the six collections, browsed book by book. */
export function HadithPage({ showTranslation, onShowTranslationChange }: HadithPageProps) {
  const { t } = useTranslation();

  return (
    <>
      <h2 className="section-title">{t("app.sectionHadith")}</h2>
      <HadithBrowser
        collections={HADITH_COLLECTIONS}
        getSections={getHadithSections}
        load={loadHadithSection}
        showTranslation={showTranslation}
        onShowTranslationChange={onShowTranslationChange}
      />
    </>
  );
}
