import Header from "@/components/Header";
import { Skeleton } from "@/components/ui/skeleton";

export const DashboardLoadingState = () => (
  <div className="page-shell">
    <Header />
    <main className="relative z-10 pb-24 pt-32">
      <div className="section-container space-y-10">
        {/* Welcome header skeleton */}
        <div className="overflow-hidden rounded-[2.5rem] border border-border/30 bg-white p-8 shadow-strong md:p-10">
          <div className="space-y-3">
            <Skeleton className="h-10 w-72 rounded-2xl" />
            <Skeleton className="h-5 w-56 rounded-xl" />
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_0.4fr]">
          <div className="space-y-8">
            {/* Procedure card skeleton */}
            <div className="overflow-hidden rounded-[2.5rem] border border-border/30 bg-white shadow-strong">
              <div className="border-b border-border/30 bg-gradient-to-r from-white to-secondary/20 p-8">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-11 w-11 rounded-xl" />
                  <Skeleton className="h-7 w-48 rounded-xl" />
                </div>
              </div>
              <div className="space-y-6 p-8">
                <Skeleton className="h-28 rounded-[1.6rem]" />
                <Skeleton className="h-10 w-40 rounded-xl" />
              </div>
            </div>

            {/* Documents card skeleton */}
            <div className="overflow-hidden rounded-[2.5rem] border border-border/30 bg-white shadow-strong">
              <div className="flex items-center justify-between border-b border-border/30 bg-gradient-to-r from-white to-secondary/20 px-8 py-8">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-11 w-11 rounded-xl" />
                  <Skeleton className="h-7 w-36 rounded-xl" />
                </div>
                <Skeleton className="h-9 w-28 rounded-xl" />
              </div>
              <div className="space-y-5 p-8">
                <Skeleton className="h-20 rounded-[2rem]" />
                <Skeleton className="h-20 rounded-[2rem]" />
              </div>
            </div>
          </div>

          {/* Profile card skeleton */}
          <div className="overflow-hidden rounded-[2.5rem] border border-border/30 bg-white shadow-strong">
            <div className="border-b border-border/30 bg-gradient-to-r from-white to-secondary/20 p-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-11 w-11 rounded-xl" />
                  <Skeleton className="h-7 w-24 rounded-xl" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            </div>
            <div className="space-y-5 p-8">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="space-y-2 rounded-xl px-3 py-2">
                  <Skeleton className="h-3 w-20 rounded" />
                  <Skeleton className="h-5 w-36 rounded-lg" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
);
