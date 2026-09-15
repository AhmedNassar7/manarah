import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});

// jsdom doesn't implement scrollIntoView at all — components that call it
// (e.g. QuranReader's jump-to-ayah) would otherwise throw in every test.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

// jsdom doesn't implement real media playback either (QuranAudioPlayer's
// <audio> element) — HTMLMediaElement.play()/pause() log a jsdom
// "not implemented" error and return undefined rather than a real promise,
// which breaks a bare `.play()` call. Stub both with harmless no-ops.
HTMLMediaElement.prototype.play = () => Promise.resolve();
HTMLMediaElement.prototype.pause = () => {};
