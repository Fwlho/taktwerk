import type { ReactNode } from "react";
import { Logo } from "@/components/ui/Logo";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center bg-bg px-4 py-12 tablet:justify-center">
      <div className="flex w-full max-w-[420px] flex-col gap-8">
        <Logo className="self-center" />
        <main className="flex flex-col gap-6 rounded-xl border border-border bg-surface p-6 tablet:p-8">{children}</main>
      </div>
    </div>
  );
}
