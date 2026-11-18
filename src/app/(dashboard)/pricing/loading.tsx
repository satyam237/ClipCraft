import { Skeleton } from "@/components/ui/skeleton";

export default function PricingLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-8 py-8">
      <div className="text-center space-y-2">
        <Skeleton className="mx-auto h-8 w-48" />
        <Skeleton className="mx-auto h-5 w-72" />
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-96 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
