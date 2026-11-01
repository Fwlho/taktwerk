import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Mono, Atkinson_Hyperlegible_Next, Bricolage_Grotesque } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { ThemeScript } from "@/components/theme/ThemeScript";
import { ToastProvider } from "@/components/ui/Toast";
import { ServiceWorker } from "@/components/notifications/ServiceWorker";
import { colorToken } from "@/lib/tokens";
import "./globals.css";

// Schriften werden beim Build heruntergeladen und von uns ausgeliefert (keine Anfragen an Google).
const sans = Atkinson_Hyperlegible_Next({ subsets: ["latin"], variable: "--font-loaded-sans", display: "swap", adjustFontFallback: false });
const mono = Atkinson_Hyperlegible_Mono({ subsets: ["latin"], variable: "--font-loaded-mono", display: "swap", adjustFontFallback: false });
const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-loaded-display", display: "swap", adjustFontFallback: false });

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return { title: { default: "Taktwerk", template: "%s · Taktwerk" }, description: t("description") };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: colorToken("color-bg", "light") },
    { media: "(prefers-color-scheme: dark)", color: colorToken("color-bg", "dark") },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${sans.variable} ${mono.variable} ${display.variable}`} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body>
        <NextIntlClientProvider>
          <ToastProvider>{children}</ToastProvider>
          <ServiceWorker />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
