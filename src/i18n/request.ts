import { getRequestConfig } from "next-intl/server";

export const defaultLocale = "de";

// Weitere Sprachen: Locale aus Profil/Cookie lesen und messages/<locale>.json anlegen.
export default getRequestConfig(async () => {
  const locale = defaultLocale;
  return {
    locale,
    timeZone: "Europe/Berlin",
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
