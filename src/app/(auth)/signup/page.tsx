import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { safeNextPath } from "@/lib/validation";
import { SignupForm } from "./SignupForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.signup");
  return { title: t("title") };
}

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const t = await getTranslations("auth.signup");
  const nextPath = safeNextPath(next);
  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="text-h1">{t("title")}</h1>
        <p className="text-body text-text-muted">{t("intro")}</p>
      </div>
      <SignupForm next={nextPath} />
      <p className="text-center text-body text-text-muted">
        {t("hasAccount")}{" "}
        <Link href={`/login?next=${encodeURIComponent(nextPath)}`} className="font-semibold text-primary hover:underline">
          {t("toLogin")}
        </Link>
      </p>
    </>
  );
}
