"use client";

import { createContext, type ReactNode, useContext } from "react";
import {
  DEFAULT_LOCALE,
  type Locale,
  type Messages,
  messages,
} from "@/messages";

// The active locale is resolved on the server (cookie) and handed to the client
// once via this provider — client components read it without touching cookies.
const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  return (
    <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>
  );
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

export function useMessages(): Messages {
  return messages[useContext(LocaleContext)];
}
