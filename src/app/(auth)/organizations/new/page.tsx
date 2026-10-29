import { getTranslations } from "next-intl/server";
import { requireUser } from "@/server/auth/session";
import { NewOrganizationForm } from "./NewOrganizationForm";

export async function generateMetadata() {
  const t = await getTranslations("organizations.new");
  return { title: t("title") };
}

export default async function NewOrganizationPage() {
  await requireUser();
  const t = await getTranslations("organizations.new");
  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="text-h1">{t("title")}</h1>
        <p className="text-body text-text-muted">{t("intro")}</p>
      </div>
      <NewOrganizationForm />
    </>
  );
}
