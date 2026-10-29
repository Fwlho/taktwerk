import { safeNextPath } from "@/lib/validation";
import { requireUser } from "@/server/auth/session";
import { SetPasswordForm } from "./SetPasswordForm";

export default async function SetPasswordPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  await requireUser();
  const { next } = await searchParams;
  return <SetPasswordForm next={safeNextPath(next)} />;
}
