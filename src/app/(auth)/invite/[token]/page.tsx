import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { buttonClasses } from "@/components/ui/Button";
import { getCurrentUser } from "@/server/auth/session";
import { AcceptInvitation } from "./AcceptInvitation";

export async function generateMetadata() {
  const t = await getTranslations("invite");
  return { title: t("metaTitle") };
}

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const t = await getTranslations("invite");
  const user = await getCurrentUser();
  const next = encodeURIComponent(`/invite/${token}`);

  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="text-h1">{t("title")}</h1>
        <p className="text-body text-text-muted">{user ? t("introLoggedIn", { email: user.email }) : t("introLoggedOut")}</p>
      </div>
      {user ? (
        <AcceptInvitation token={token} />
      ) : (
        <div className="flex flex-col gap-2">
          <Link href={`/signup?next=${next}`} className={buttonClasses({ variant: "primary", block: true })}>
            {t("signup")}
          </Link>
          <Link href={`/login?next=${next}`} className={buttonClasses({ variant: "secondary", block: true })}>
            {t("login")}
          </Link>
        </div>
      )}
    </>
  );
}
