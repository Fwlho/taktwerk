import { z } from "zod";

// Fehlermeldungen sind Übersetzungsschlüssel unter "validation.*" (messages/de.json).

export const emailSchema = z.string().trim().toLowerCase().email("email");
export const passwordSchema = z.string().min(10, "passwordMin").max(72, "passwordMax");

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "required"),
});
export type SignInInput = z.infer<typeof signInSchema>;

export const signUpSchema = z.object({
  fullName: z.string().trim().min(2, "nameMin").max(120, "tooLong"),
  email: emailSchema,
  password: passwordSchema,
});
export type SignUpInput = z.infer<typeof signUpSchema>;

export const forgotPasswordSchema = z.object({ email: emailSchema });
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const newPasswordSchema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: "passwordMismatch", path: ["confirm"] });
export type NewPasswordInput = z.infer<typeof newPasswordSchema>;

export const profileNameSchema = z.object({
  fullName: z.string().trim().min(2, "nameMin").max(120, "tooLong"),
});
export type ProfileNameInput = z.infer<typeof profileNameSchema>;

export const organizationSchema = z.object({
  name: z.string().trim().min(2, "nameMin").max(120, "tooLong"),
});
export type OrganizationInput = z.infer<typeof organizationSchema>;

export const INDUSTRIES = ["craft", "gastronomy", "retail", "services", "health", "beauty", "other"] as const;
export const AUDIENCES = ["private", "business", "property", "applicants", "tourists", "regulars"] as const;
export const VOICES = ["du_casual", "sie_friendly", "sie_formal"] as const;
export const RADII = [5, 10, 15, 25, 50, 100] as const;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, "tooLong")
    .transform((v) => (v === "" ? null : v));

export const organizationProfileSchema = z.object({
  industry: z.enum(INDUSTRIES, "required"),
  location: optionalText(120),
  radiusKm: z.union([z.literal(""), z.coerce.number().int().min(0).max(1000)]).transform((v) => (v === "" ? null : v)),
  website: z
    .string()
    .trim()
    .max(300, "tooLong")
    .transform((v) => (v === "" ? null : /^https?:\/\//i.test(v) ? v : `https://${v}`))
    .pipe(z.url("url").nullable()),
  targetAudiences: z.array(z.enum(AUDIENCES)).max(20),
  voice: z.enum(VOICES),
  services: z
    .string()
    .max(2000, "tooLong")
    .transform((v) =>
      v
        .split(/[,\n]/)
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 50),
    ),
});
export type OrganizationProfileFormValues = z.input<typeof organizationProfileSchema>;
export type OrganizationProfileInput = z.output<typeof organizationProfileSchema>;

/** Ansprache-Voreinstellung ↔ Spalten address_form + tone */
export function voiceToColumns(voice: (typeof VOICES)[number]) {
  const [addressForm, tone] = voice.split("_") as ["du" | "sie", string];
  return { addressForm, tone };
}
export function columnsToVoice(addressForm: "du" | "sie", tone: string | null): (typeof VOICES)[number] {
  const voice = `${addressForm}_${tone ?? ""}`;
  return (VOICES as readonly string[]).includes(voice)
    ? (voice as (typeof VOICES)[number])
    : addressForm === "du"
      ? "du_casual"
      : "sie_friendly";
}

export const inviteSchema = z.object({
  email: emailSchema,
  role: z.enum(["owner", "editor", "external", "viewer"]),
});
export type InviteInput = z.infer<typeof inviteSchema>;

/** Nur interne Pfade als Weiterleitungsziel zulassen. */
export function safeNextPath(next: unknown, fallback = "/start"): string {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return fallback;
  }
  return next;
}

/** Aus Unternehmensname einen URL-Teil machen (ä→ae …). */
export function slugify(name: string): string {
  const map: Record<string, string> = { ä: "ae", ö: "oe", ü: "ue", ß: "ss" };
  const slug = name
    .toLowerCase()
    .replace(/[äöüß]/g, (c) => map[c] ?? c)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
  return slug.length >= 3 ? slug : `${slug || "betrieb"}-${Math.random().toString(36).slice(2, 6)}`;
}
