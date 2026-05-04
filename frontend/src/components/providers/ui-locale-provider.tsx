"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { PriorityLocale } from "@/lib/priorities";

const UI_LOCALE_STORAGE_KEY = "life-simulator.ui-locale";

type UiLocaleContextValue = {
  locale: PriorityLocale;
  setLocale: (locale: PriorityLocale) => void;
  isReady: boolean;
};

const UiLocaleContext = createContext<UiLocaleContextValue | null>(null);

function readStoredLocale(): PriorityLocale | null {
  if (typeof window === "undefined") {
    return null;
  }

  const stored = window.localStorage.getItem(UI_LOCALE_STORAGE_KEY);

  if (stored === "ko" || stored === "en") {
    return stored;
  }

  return null;
}

function resolveInitialLocale(): PriorityLocale {
  if (typeof window === "undefined") {
    return "ko";
  }

  return readStoredLocale() ?? "ko";
}

export function UiLocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<PriorityLocale>("ko");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const nextLocale = resolveInitialLocale();
    setLocaleState(nextLocale);
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady || typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(UI_LOCALE_STORAGE_KEY, locale);
    document.documentElement.lang = locale;
  }, [isReady, locale]);

  const value = useMemo<UiLocaleContextValue>(
    () => ({
      locale,
      setLocale: setLocaleState,
      isReady,
    }),
    [isReady, locale],
  );

  return (
    <UiLocaleContext.Provider value={value}>
      {children}
    </UiLocaleContext.Provider>
  );
}

export function useUiLocale(): UiLocaleContextValue {
  const context = useContext(UiLocaleContext);

  if (!context) {
    throw new Error("useUiLocale must be used within UiLocaleProvider.");
  }

  return context;
}

export { UI_LOCALE_STORAGE_KEY };
