import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif, Lora, Nunito } from "next/font/google";
import "./globals.css";

import { ThemeApplier } from "@/components/layout/ThemeApplier";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Editorial serif reserved for the Stet wordmark — nods to proofreading heritage.
const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  weight: "400",
  subsets: ["latin"],
});

// Selectable document fonts (see the Font picker in Page setup).
const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Stet",
  description:
    "Stet — an open source, local-first document editor with an AI that marks up your writing like a human editor.",
};

/**
 * Sets data-theme before first paint so a dark/sepia user never sees a light
 * flash. Must stay in sync with resolveThemeAttribute in lib/themes.ts.
 */
const THEME_INIT_SCRIPT = `(function(){try{var s=JSON.parse(localStorage.getItem("editor-ui-preferences")||"{}").state||{};var t=s.theme||"system";if(t==="system"){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme="light"}})()`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} ${lora.variable} ${nunito.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeApplier />
        {children}
      </body>
    </html>
  );
}
