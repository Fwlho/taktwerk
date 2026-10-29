import { ComingSoonPage } from "@/components/layout/ComingSoonPage";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ComingSoonPage slug={slug} section="channels" />;
}
