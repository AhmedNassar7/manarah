export type AzkarTrigger =
  | "morning"
  | "evening"
  | "post-salah"
  | "before-sleep"
  | "waking"
  | "custom-time";

export interface AzkarItem {
  id: string;
  arabic: string;
  transliteration?: string;
  translation?: string;
  repeatCount: number;
  audioUrl?: string;
}

export interface AzkarCategory {
  id: string;
  name: string;
  trigger: AzkarTrigger;
  items: AzkarItem[];
}

export interface AzkarSchedule {
  categoryId: string;
  /** Overrides the category's default trigger; e.g. remapped to a custom time-of-day. */
  trigger: AzkarTrigger;
  /** 24h "HH:mm", required when trigger is "custom-time". */
  customTime?: string;
  muted: boolean;
}
