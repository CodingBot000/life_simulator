import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "@/App";
import { UiLocaleProvider } from "@/components/providers/ui-locale-provider";

import "@/styles/globals.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element #root was not found.");
}

createRoot(rootElement).render(
  <StrictMode>
    <UiLocaleProvider>
      <App />
    </UiLocaleProvider>
  </StrictMode>,
);
