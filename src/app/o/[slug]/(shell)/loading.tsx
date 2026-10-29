import { Skeleton } from "@/components/ui/Skeleton";

// Erscheint nur bei langsamer Antwort; Skelette in Endgröße, damit nichts springt.
export default function Loading() {
  return (
    <div aria-busy className="flex animate-[tw-fade-in_var(--duration-base)_300ms_both] flex-col gap-6">
      <Skeleton className="h-[34px] w-64 desktop:h-11" />
      <Skeleton className="h-[26px] w-96 max-w-full" />
      <div className="grid gap-4 desktop:grid-cols-12">
        <Skeleton className="h-72 rounded-lg desktop:col-span-8" />
        <Skeleton className="h-72 rounded-lg desktop:col-span-4" />
      </div>
    </div>
  );
}
