import type { MetadataRoute } from "next";
import { getTranslations } from "next-intl/server";
import { colorToken } from "@/lib/tokens";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const t = await getTranslations("meta");
  return {
    name: "Taktwerk",
    short_name: "Taktwerk",
    description: t("description"),
    lang: "de",
    start_url: "/start",
    scope: "/",
    display: "standalone",
    background_color: colorToken("color-bg", "light"),
    theme_color: colorToken("color-primary", "light"),
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
