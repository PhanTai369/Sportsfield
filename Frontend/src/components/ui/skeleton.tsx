import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-primary/10", className)}
      {...props}
    />
  )
}

export { Skeleton }

// Booking specific skeleton components
export function BookingCardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        {/* Left side - Main info */}
        <div className="flex-grow space-y-3">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
            <Skeleton className="h-6 w-20" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-5 w-24" />
            </div>
            <div className="space-y-1">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-5 w-32" />
            </div>
            <div className="space-y-1">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-5 w-28" />
            </div>
          </div>
        </div>

        {/* Right side - Actions */}
        <div className="flex flex-col gap-2 md:w-48">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      </div>
    </div>
  );
}

export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
            </div>
            <Skeleton className="h-12 w-12 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}
