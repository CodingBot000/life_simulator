import type { Metadata } from "next";
import type { ReactNode } from "react";

import { UiLocaleProvider } from "@/components/providers/ui-locale-provider";

import "./globals.css";

export const metadata: Metadata = {
  title: "Decision Life Simulator",
  description: "AI agent chain powered decision simulation MVP",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <UiLocaleProvider>{children}</UiLocaleProvider>
      </body>
    </html>
  );
}
