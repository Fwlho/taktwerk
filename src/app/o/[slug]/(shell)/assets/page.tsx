import { getTranslations } from "next-intl/server";
import { AssetLibrary } from "@/components/assets/AssetLibrary";
import { listAssets } from "@/server/assets/queries";
import { requireNavAccess } from "@/server/auth/nav-access";

export async function generateMetadata() {
  const tn = await getTranslations("nav.items");
  return { title: tn("assets") };
}

export default async function AssetsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { organization, role } = await requireNavAccess(slug, "assets");
  const assets = await listAssets(organization.id);
  return <AssetLibrary slug={slug} organizationId={organization.id} role={role} assets={assets} />;
}
