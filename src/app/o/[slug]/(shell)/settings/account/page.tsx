import { getTranslations } from "next-intl/server";
import { AccountNameForm } from "@/components/organization/AccountNameForm";
import { ThemeSwitch } from "@/components/theme/ThemeSwitch";
import { requireUser } from "@/server/auth/session";

export default async function AccountPage() {
  const user = await requireUser();
  const t = await getTranslations("account");
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5 tablet:p-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-h2">{t("profileTitle")}</h2>
          <p className="text-body text-text-muted">{t("emailInfo", { email: user.email })}</p>
        </div>
        <AccountNameForm fullName={user.fullName} />
      </section>
      <section className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5 tablet:p-6">
        <h2 className="text-h2">{t("appearanceTitle")}</h2>
        <ThemeSwitch />
      </section>
    </div>
  );
}
