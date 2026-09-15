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
