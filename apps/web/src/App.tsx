import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { HashRouter, Route, Routes, useLocation } from "react-router-dom";
import {
  applyEvent,
  AZKAR_PROGRESS_STORAGE_KEY,
  TASBIH_STORAGE_KEY,
  dayKey,
  emptyAzkarProgress,
  emptyTasbih,
  normalizeAzkarProgress,
  normalizeTasbih,
  setCounts as setAzkarCounts,
  clampHijriAdjustment,
  emptyProgress,
  normalizeProgress,
  PROGRESS_STORAGE_KEY,
  clampReaderFontStep,
  computePrayerTimes,
  nearestCity,
  setNote,
  shouldRefreshLocationFromGps,
  toggleBookmark,
  resolveTheme,
  themeAttributes,
  withDefaultSettings,
  withDefaultZakatForm,
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY,
  VERSE_ANNOTATIONS_STORAGE_KEY,
  ZAKAT_STORAGE_KEY,
  type AzkarProgressState,
  type AzkarSchedule,
  type City,
  type Coordinates,
  type DailyPrayerTimes,
  type Language,
  type PrayerTimesSettings,
  type ProgressEvent,
  type ProgressPrayer,
  type ProgressState,
  type ReciterStyle,
  type SavedLocation,
  type TasbihState,
  type Translation,
  type UserSettings,
  type Verse,
  type VerseAnnotations,
  type VerseRef,
  type ZakatForm,
} from "@manarah/core";
import {
  DEFAULT_TRANSLATION_EDITION_ID,
  findCities,
  getAllCities,
  getJuzStart,
  getPageStart,
  getSurah,
  getTranslationForSurah,
  getVersesForSurah,
} from "@manarah/data";
import { IndexedDbStore } from "@manarah/storage";
import { InstallBanner, InstallButton, LanguageProvider, LanguageSwitcher, ShareButton, Toast, encouragementText, translate, useTranslation, type LocationSummaryProps } from "@manarah/ui";
import { Nav } from "./Nav.js";
import { NotificationPrompt } from "./NotificationPrompt.js";
import { startNotificationLoop } from "./notifications.js";
import { useInstall } from "./install.js";
import { useInstallNudge } from "./install-nudge.js";
import { appShareUrl } from "./share-url.js";
import { withViewTransition } from "./view-transition.js";
import { AzkarPage } from "./pages/AzkarPage.js";
import { Home } from "./pages/Home.js";
import { PrayerPage } from "./pages/PrayerPage.js";
import { QiblaPage } from "./pages/QiblaPage.js";
import { CalendarPage } from "./pages/CalendarPage.js";
import { ChallengePage } from "./pages/ChallengePage.js";
import { HadithPage } from "./pages/HadithPage.js";
import { QuranPage } from "./pages/QuranPage.js";
import { SettingsPage } from "./pages/SettingsPage.js";
import { TasbihPage } from "./pages/TasbihPage.js";
import { ZakatPage } from "./pages/ZakatPage.js";

const store = new IndexedDbStore();

const geolocationAvailable = typeof navigator !== "undefined" && "geolocation" in navigator;

/** iOS 13+ only delivers deviceorientation events after a permission request made from a user tap. */
type OrientationEventWithPermission = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};
const orientationPermissionNeeded =
  typeof DeviceOrientationEvent !== "undefined" &&
  typeof (DeviceOrientationEvent as OrientationEventWithPermission).requestPermission === "function";

/** Tomorrow's Fajr — lets PrayerCountdown roll over once tonight's Isha has passed, instead of going dead until midnight. */
function tomorrowsFajrFor(coordinates: Coordinates, settings: UserSettings["prayerTimesSettings"]): Date {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return computePrayerTimes(coordinates, tomorrow, settings).fajr;
}

export function App() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [times, setTimes] = useState<DailyPrayerTimes | null>(null);
  const [tomorrowsFajr, setTomorrowsFajr] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [heading, setHeading] = useState<number | undefined>(undefined);
  const [selectedSurahNumber, setSelectedSurahNumber] = useState<number | null>(null);
  const [focusAyah, setFocusAyah] = useState<number | undefined>(undefined);
  const [selectedSurahVerses, setSelectedSurahVerses] = useState<Verse[] | null>(null);
  const [selectedSurahTranslation, setSelectedSurahTranslation] = useState<Translation[] | null>(null);
  const [verseAnnotations, setVerseAnnotations] = useState<VerseAnnotations>({});
  const [zakatForm, setZakatForm] = useState<ZakatForm>(() => withDefaultZakatForm(undefined));
  const [progress, setProgress] = useState<ProgressState>(emptyProgress);
  // The latest progress, readable synchronously: two awards in the same tick must build on each other, not on a stale render.
  const progressRef = useRef<ProgressState>(progress);
  const [toast, setToast] = useState<{ message: string; id: number } | undefined>(undefined);
  const dismissToast = useCallback(() => setToast(undefined), []);
  const [tasbih, setTasbih] = useState<TasbihState>(emptyTasbih);
  const [azkarProgress, setAzkarProgress] = useState<AzkarProgressState>(() => emptyAzkarProgress(new Date()));

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const stored = withDefaultSettings(await store.get<UserSettings>(SETTINGS_STORAGE_KEY));
      const storedAnnotations = await store.get<VerseAnnotations>(VERSE_ANNOTATIONS_STORAGE_KEY);
      const storedZakat = await store.get<Partial<ZakatForm>>(ZAKAT_STORAGE_KEY);
      const storedProgress = normalizeProgress(await store.get<unknown>(PROGRESS_STORAGE_KEY));
      const storedTasbih = await store.get<unknown>(TASBIH_STORAGE_KEY);
      const storedAzkar = await store.get<unknown>(AZKAR_PROGRESS_STORAGE_KEY);
      if (cancelled) return;
      progressRef.current = storedProgress;
      setProgress(storedProgress);
      setTasbih(normalizeTasbih(storedTasbih));
      setAzkarProgress(normalizeAzkarProgress(storedAzkar, new Date()));
      setSettings(stored);
      setZakatForm(withDefaultZakatForm(storedZakat));
      setVerseAnnotations(storedAnnotations ?? {});
      // Resume wherever the user last left off, rather than always starting at Al-Fatiha.
      setSelectedSurahNumber(stored.lastRead?.surah ?? 1);
      if (stored.lastRead && stored.lastRead.ayah > 1) setFocusAyah(stored.lastRead.ayah);
      if (stored.coordinates) {
        setTimes(computePrayerTimes(stored.coordinates, new Date(), stored.prayerTimesSettings));
        setTomorrowsFajr(tomorrowsFajrFor(stored.coordinates, stored.prayerTimesSettings));
      }

      // A city the user picked by hand is kept as-is — GPS must not
      // silently replace it on every visit. Only a previous GPS fix (or no
      // location at all) is refreshed.
      if (!shouldRefreshLocationFromGps(stored.location)) return;
      if (!geolocationAvailable) {
        if (!stored.coordinates) setError(translate(stored.language, "app.geolocationUnavailable"));
        return;
      }
      locateWithGps({ quietIfAlreadyLocated: stored.coordinates !== undefined, isCancelled: () => cancelled });
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (selectedSurahNumber === null) return;
    let cancelled = false;
    void getVersesForSurah(selectedSurahNumber).then((verses) => {
      if (!cancelled) setSelectedSurahVerses(verses);
    });
    setSelectedSurahTranslation(null);
    void getTranslationForSurah(selectedSurahNumber, DEFAULT_TRANSLATION_EDITION_ID).then((translation) => {
      if (!cancelled) setSelectedSurahTranslation(translation);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedSurahNumber]);

  useEffect(() => {
    // Best-effort live compass heading — most desktops/laptops have no
    // orientation sensor at all, in which case no event ever fires and
    // QiblaCompass just stays in its static, north-up fallback mode.
    function handleOrientation(event: DeviceOrientationEvent) {
      const webkitHeading = (event as DeviceOrientationEvent & { webkitCompassHeading?: number })
        .webkitCompassHeading;
      if (typeof webkitHeading === "number") {
        setHeading(webkitHeading);
      } else if (event.absolute && event.alpha !== null) {
        setHeading(360 - event.alpha);
      }
    }

    window.addEventListener("deviceorientationabsolute", handleOrientation);
    window.addEventListener("deviceorientation", handleOrientation);
    return () => {
      window.removeEventListener("deviceorientationabsolute", handleOrientation);
      window.removeEventListener("deviceorientation", handleOrientation);
    };
  }, []);

  // Apply the chosen theme to <html>: the stylesheet keys on data-theme (light/dark) and data-palette.
  const themeApplied = useRef(false);
  useEffect(() => {
    const { mode, palette } = themeAttributes(resolveTheme(settings.theme));
    const root = document.documentElement;
    const apply = () => {
      if (mode) root.dataset.theme = mode;
      else delete root.dataset.theme;
      if (palette) root.dataset.palette = palette;
      else delete root.dataset.palette;
    };
    // The first application (page load) is immediate; a change made by the person crossfades.
    if (themeApplied.current) withViewTransition(apply);
    else apply();
    themeApplied.current = true;
  }, [settings.theme]);

  useEffect(() => {
    if (typeof Notification === "undefined") return;
    return startNotificationLoop(store);
  }, []);

  function handleSchedulesChange(azkarSchedules: AzkarSchedule[]) {
    setSettings((prev) => {
      const next = { ...prev, azkarSchedules };
      void store.set(SETTINGS_STORAGE_KEY, next);
      return next;
    });
  }

  function handlePrayerSettingsChange(prayerTimesSettings: PrayerTimesSettings) {
    setSettings((prev) => {
      const next = { ...prev, prayerTimesSettings };
      void store.set(SETTINGS_STORAGE_KEY, next);
      if (next.coordinates) {
        setTimes(computePrayerTimes(next.coordinates, new Date(), prayerTimesSettings));
        setTomorrowsFajr(tomorrowsFajrFor(next.coordinates, prayerTimesSettings));
      }
      return next;
    });
  }

  /** Persists coordinates together with their label/provenance, and recomputes today's times for them. */
  function saveLocation(coordinates: Coordinates, location: SavedLocation) {
    setSettings((prev) => {
      const next = { ...prev, coordinates, location };
      void store.set(SETTINGS_STORAGE_KEY, next);
      setTimes(computePrayerTimes(coordinates, new Date(), next.prayerTimesSettings));
      setTomorrowsFajr(tomorrowsFajrFor(coordinates, next.prayerTimesSettings));
      return next;
    });
  }

  function locateWithGps({
    quietIfAlreadyLocated = false,
    isCancelled = () => false,
  }: { quietIfAlreadyLocated?: boolean; isCancelled?: () => boolean } = {}) {
    if (!geolocationAvailable) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        if (isCancelled()) return;
        const coordinates = { latitude: position.coords.latitude, longitude: position.coords.longitude };
        setError(null);
        saveLocation(coordinates, { source: "gps" });
        // Name the fix after the nearest bundled city — on-device, no reverse-geocoding service.
        void getAllCities().then((cities) => {
          const city = nearestCity(cities, coordinates);
          if (!city || isCancelled()) return;
          setSettings((prev) => {
            // Only label the fix just taken; if a city was picked meanwhile, that choice wins.
            if (prev.coordinates !== coordinates) return prev;
            const next = {
              ...prev,
              location: { source: "gps" as const, name: city.name, nameAr: city.nameAr ?? "", countryCode: city.countryCode },
            };
            void store.set(SETTINGS_STORAGE_KEY, next);
            return next;
          });
        });
      },
      (geoError) => {
        setLocating(false);
        if (!isCancelled() && !quietIfAlreadyLocated) setError(geoError.message);
      }
    );
  }

  // A location saved before cities had Arabic names carries only the English one: look the Arabic name up once, the first time it is wanted.
  const legacyName = settings.location?.name;
  const legacyCountry = settings.location?.countryCode;
  const needsArabicName = settings.language === "ar" && legacyName !== undefined && settings.location?.nameAr === undefined;
  useEffect(() => {
    if (!needsArabicName || !legacyName) return;
    let cancelled = false;
    void getAllCities().then((cities) => {
      if (cancelled) return;
      const match = cities.find((c) => c.name === legacyName && c.countryCode === legacyCountry);
      setSettings((prev) => {
        if (!prev.location || prev.location.name !== legacyName || prev.location.nameAr !== undefined) return prev;
        const next = { ...prev, location: { ...prev.location, nameAr: match?.nameAr ?? "" } };
        void store.set(SETTINGS_STORAGE_KEY, next);
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [needsArabicName, legacyName, legacyCountry]);

  function handleCitySelect(city: City) {
    setError(null);
    saveLocation(
      { latitude: city.latitude, longitude: city.longitude },
      { source: "city", name: city.name, nameAr: city.nameAr ?? "", countryCode: city.countryCode }
    );
  }

  function handleEnableLiveCompass() {
    // Listeners are already attached (see the orientation effect) — once
    // permission is granted, events simply start arriving.
    void (DeviceOrientationEvent as OrientationEventWithPermission).requestPermission?.().catch(() => {});
  }

  const locationSummary: LocationSummaryProps = {
    coordinates: settings.coordinates,
    location: settings.location,
    search: findCities,
    onCitySelect: handleCitySelect,
    onUseCurrentLocation: geolocationAvailable ? () => locateWithGps() : undefined,
    locating,
    error,
  };

  function handleQuranNavigate(ref: VerseRef) {
    setSelectedSurahNumber(ref.surah);
    setFocusAyah(ref.ayah > 1 ? ref.ayah : undefined);
    setSettings((prev) => {
      const next = { ...prev, lastRead: ref };
      void store.set(SETTINGS_STORAGE_KEY, next);
      return next;
    });
  }

  function handleLanguageChange(language: Language) {
    setSettings((prev) => {
      const next = { ...prev, language };
      void store.set(SETTINGS_STORAGE_KEY, next);
      return next;
    });
  }

  function handleReciterStyleChange(reciterStyle: ReciterStyle) {
    setSettings((prev) => {
      const next = { ...prev, reciterStyle };
      void store.set(SETTINGS_STORAGE_KEY, next);
      return next;
    });
  }

  function handleTranslationAudioChange(translationAudio: boolean) {
    setSettings((prev) => {
      const next = { ...prev, translationAudio };
      void store.set(SETTINGS_STORAGE_KEY, next);
      return next;
    });
  }

  function handleReciterChange(reciterId: string) {
    setSettings((prev) => {
      const next = { ...prev, reciterId };
      void store.set(SETTINGS_STORAGE_KEY, next);
      return next;
    });
  }

  function updateVerseAnnotations(update: (prev: VerseAnnotations) => VerseAnnotations) {
    setVerseAnnotations((prev) => {
      const next = update(prev);
      void store.set(VERSE_ANNOTATIONS_STORAGE_KEY, next);
      return next;
    });
  }

  function handleTafsirEditionChange(tafsirEditionId: string) {
    setSettings((prev) => {
      const next = { ...prev, tafsirEditionId };
      void store.set(SETTINGS_STORAGE_KEY, next);
      return next;
    });
  }

  function handleReaderFontStepChange(readerFontStep: number) {
    setSettings((prev) => {
      const next = { ...prev, readerFontStep: clampReaderFontStep(readerFontStep) };
      void store.set(SETTINGS_STORAGE_KEY, next);
      return next;
    });
  }

  function handleShowTranslationChange(showTranslation: boolean) {
    setSettings((prev) => {
      const next = { ...prev, showTranslation };
      void store.set(SETTINGS_STORAGE_KEY, next);
      return next;
    });
  }

  function handleHijriAdjustmentChange(days: number) {
    setSettings((prev) => {
      const next = { ...prev, hijriAdjustment: clampHijriAdjustment(days) };
      void store.set(SETTINGS_STORAGE_KEY, next);
      return next;
    });
  }

  function handleObservanceRemindersChange(observanceReminders: boolean) {
    setSettings((prev) => {
      const next = { ...prev, observanceReminders };
      void store.set(SETTINGS_STORAGE_KEY, next);
      return next;
    });
  }

  function handleZakatFormChange(next: ZakatForm) {
    setZakatForm(next);
    void store.set(ZAKAT_STORAGE_KEY, next);
  }

  /** Merges a change into the saved settings — for the Settings page, whose controls need no side effects beyond saving. */
  function handleSettingsPatch(patch: Partial<UserSettings>) {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      void store.set(SETTINGS_STORAGE_KEY, next);
      return next;
    });
  }

  /**
   * Records one good deed: updates points/streak/badges, saves them, and shows
   * the encouragement for it. Returns the points it earned (the quiz totals them).
   */
  function award(event: ProgressEvent): number {
    const result = applyEvent(progressRef.current, event, new Date());
    progressRef.current = result.state;
    setProgress(result.state);
    void store.set(PROGRESS_STORAGE_KEY, result.state);
    const message = encouragementText(result, (key, vars) => translate(settings.language, key, vars));
    if (message) setToast((prev) => ({ message, id: (prev?.id ?? 0) + 1 }));
    return result.pointsDelta;
  }

  function handleTasbihChange(next: TasbihState) {
    setTasbih(next);
    void store.set(TASBIH_STORAGE_KEY, next);
  }

  /** Saves one azkar list's tallies for today (a new day starts every list from zero). */
  function handleAzkarCounts(categoryId: string, counts: Record<string, number>) {
    setAzkarProgress((prev) => {
      const next = setAzkarCounts(prev, categoryId, counts, new Date());
      void store.set(AZKAR_PROGRESS_STORAGE_KEY, next);
      return next;
    });
  }

  function handlePrayerToggle(prayer: ProgressPrayer, done: boolean) {
    award({ type: "prayer", prayer, done });
  }

  function handleToggleBookmark(surah: number, ayah: number) {
    updateVerseAnnotations((prev) => toggleBookmark(prev, surah, ayah, new Date()));
  }

  function handleSaveNote(surah: number, ayah: number, note: string) {
    updateVerseAnnotations((prev) => setNote(prev, surah, ayah, note, new Date()));
  }

  const selectedSurah = selectedSurahNumber !== null ? getSurah(selectedSurahNumber) : undefined;

  return (
    <LanguageProvider language={settings.language} onLanguageChange={handleLanguageChange}>
      <HashRouter>
        <AppShell>
          <Routes>
            <Route
              path="/"
              element={
                <Home
                  locationSummary={locationSummary}
                  coordinates={settings.coordinates}
                  times={times}
                  tomorrowsFajr={tomorrowsFajr}
                  heading={heading}
                  hijriAdjustment={settings.hijriAdjustment}
                  progress={progress}
                  onPrayerToggle={handlePrayerToggle}
                />
              }
            />
            <Route
              path="/prayer"
              element={
                <PrayerPage
                  locationSummary={locationSummary}
                  coordinates={settings.coordinates}
                  times={times}
                  tomorrowsFajr={tomorrowsFajr}
                  prayerTimesSettings={settings.prayerTimesSettings}
                  onPrayerSettingsChange={handlePrayerSettingsChange}
                  hijriAdjustment={settings.hijriAdjustment}
                />
              }
            />
            <Route
              path="/qibla"
              element={
                <QiblaPage
                  locationSummary={locationSummary}
                  coordinates={settings.coordinates}
                  heading={heading}
                  onEnableLiveCompass={orientationPermissionNeeded ? handleEnableLiveCompass : undefined}
                />
              }
            />
            <Route
              path="/quran"
              element={
                <QuranPage
                  selectedSurahNumber={selectedSurahNumber}
                  focusAyah={focusAyah}
                  selectedSurah={selectedSurah}
                  selectedSurahVerses={selectedSurahVerses}
                  selectedSurahTranslation={selectedSurahTranslation}
                  onNavigate={handleQuranNavigate}
                  resolveJuzStart={getJuzStart}
                  resolvePageStart={getPageStart}
                  reciterId={settings.reciterId}
                  onReciterChange={handleReciterChange}
                  reciterStyle={settings.reciterStyle}
                  onReciterStyleChange={handleReciterStyleChange}
                  translationAudio={settings.translationAudio}
                  onTranslationAudioChange={handleTranslationAudioChange}
                  verseAnnotations={verseAnnotations}
                  onToggleBookmark={handleToggleBookmark}
                  onSaveNote={handleSaveNote}
                  tafsirEditionId={settings.tafsirEditionId}
                  onTafsirEditionChange={handleTafsirEditionChange}
                  readerFontStep={settings.readerFontStep}
                  onReaderFontStepChange={handleReaderFontStepChange}
                  showTranslation={settings.showTranslation}
                  onShowTranslationChange={handleShowTranslationChange}
                />
              }
            />
            <Route
              path="/calendar"
              element={
                <CalendarPage
                  times={times}
                  hijriAdjustment={settings.hijriAdjustment}
                  onHijriAdjustmentChange={handleHijriAdjustmentChange}
                  observanceReminders={settings.observanceReminders}
                  onObservanceRemindersChange={handleObservanceRemindersChange}
                />
              }
            />
            <Route
              path="/settings"
              element={
                <SettingsPage
                  settings={settings}
                  onSettingsChange={handleSettingsPatch}
                  onPrayerSettingsChange={handlePrayerSettingsChange}
                  locationSummary={locationSummary}
                  store={store}
                />
              }
            />
            <Route
              path="/zakat"
              element={<ZakatPage form={zakatForm} onChange={handleZakatFormChange} countryCode={settings.location?.countryCode} store={store} />}
            />
            <Route
              path="/hadith"
              element={
                <HadithPage
                  showTranslation={settings.showTranslation}
                  onShowTranslationChange={handleShowTranslationChange}
                />
              }
            />
            <Route
              path="/azkar"
              element={
                <AzkarPage
                  azkarSchedules={settings.azkarSchedules}
                  onSchedulesChange={handleSchedulesChange}
                  showTranslation={settings.showTranslation}
                  onShowTranslationChange={handleShowTranslationChange}
                  onAzkarCompleted={() => award({ type: "azkar-completed" })}
                  todaysCounts={azkarProgress.date === dayKey(new Date()) ? azkarProgress.categories : {}}
                  onCountsChange={handleAzkarCounts}
                />
              }
            />
            <Route
              path="/tasbih"
              element={<TasbihPage state={tasbih} onChange={handleTasbihChange} onMilestone={() => award({ type: "tasbih-milestone" })} />}
            />
            <Route
              path="/challenge"
              element={<ChallengePage progress={progress} onQuizAnswer={(correct) => award({ type: "quiz-answer", correct })} />}
            />
          </Routes>
          <Toast message={toast?.message} id={toast?.id ?? 0} onDismiss={dismissToast} />
        </AppShell>
      </HashRouter>
    </LanguageProvider>
  );
}

/** Header + nav, shared by every route. Sits inside LanguageProvider so it (and the routed page inside it) can call useTranslation(). */
function AppShell({ children }: { children: ReactNode }) {
  const { t, language } = useTranslation();
  const install = useInstall();
  // Each section has its own colour (see "Joy layer" in styles.css); the router path says which one we're in.
  const section = useLocation().pathname.split("/")[1] || "home";
  // The invitation to install: not on the tasbih, where the thumb taps the lower half of the screen.
  const nudge = useInstallNudge(install, section === "tasbih");

  // The tab title follows the language too.
  useEffect(() => {
    document.title = t("app.name");
  }, [t]);

  return (
    <main className="app-shell" data-section={section}>
      <header className="app-header">
        <h1 lang={language}>
          <img className="app-logo" src="favicon.svg" alt="" width={36} height={36} />
          {t("app.name")}
        </h1>
        <span className="tagline">{t("app.tagline")}</span>
        <div className="app-header-actions">
          <InstallButton platform={install.platform} canPrompt={install.canPrompt} installed={install.installed} onInstall={() => void install.prompt()} />
          <ShareButton url={appShareUrl()} />
          <LanguageSwitcher />
        </div>
      </header>
      <Nav />
      <div className="app-content" data-section={section}>
        <NotificationPrompt />
        {children}
      </div>
      {nudge.show && (
        <InstallBanner
          platform={install.platform}
          canPrompt={install.canPrompt}
          logo="favicon.svg"
          onInstall={() => {
            void install.prompt();
            nudge.dismiss(); // if they back out of the browser's own dialog, it counts as 'not now'
          }}
          onDismiss={nudge.dismiss}
        />
      )}
    </main>
  );
}
