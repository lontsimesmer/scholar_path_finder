import { Skeleton } from "@/components/ui/skeleton";

export const CheckoutLoadingState = () => (
  <div className="page-shell px-4 py-8">
    <div className="section-container relative z-10 space-y-8">
      <div className="surface-panel overflow-hidden px-6 py-6 md:px-8 md:py-7">
        <div className="flex items-center gap-6">
          <Skeleton className="h-16 w-16 rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <div className="mt-8 space-y-4">
          <Skeleton className="h-10 w-3/4 md:w-1/2" />
          <Skeleton className="h-20 w-full md:w-2/3" />
        </div>
      </div>
      <div className="grid gap-8 lg:grid-cols-2">
        <Skeleton className="h-[500px] w-full rounded-3xl" />
        <Skeleton className="h-[500px] w-full rounded-3xl" />
      </div>
    </div>
  </div>
);
