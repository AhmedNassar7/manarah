import type { ZakatForm } from "@manarah/core";
import { useTranslation, ZakatCalculator } from "@manarah/ui";

export interface ZakatPageProps {
  form: ZakatForm;
  onChange: (form: ZakatForm) => void;
}

/** The zakat calculator route. */
export function ZakatPage({ form, onChange }: ZakatPageProps) {
  const { t } = useTranslation();

  return (
    <>
      <h2 className="section-title">{t("app.sectionZakat")}</h2>
      <ZakatCalculator form={form} onChange={onChange} />
    </>
  );
}
