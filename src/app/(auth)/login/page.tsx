import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { safeNextPath } from "@/lib/validation";
import { LoginForm } from "./LoginForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.login");
  return { title: t("title") };
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  const t = await getTranslations("auth.login");
  const nextPath = safeNextPath(next);
  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="text-h1">{t("title")}</h1>
        <p className="text-body text-text-muted">{t("intro")}</p>
      </div>
      <LoginForm next={nextPath} linkError={error === "link"} />
      <p className="text-center text-body text-text-muted">
        {t("noAccount")}{" "}
        <Link href={`/signup?next=${encodeURIComponent(nextPath)}`} className="font-semibold text-primary hover:underline">
          {t("toSignup")}
        </Link>
      </p>
    </>
  );
}
