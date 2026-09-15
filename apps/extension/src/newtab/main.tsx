import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { NewTab } from "./NewTab.js";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <NewTab />
  </StrictMode>
);
