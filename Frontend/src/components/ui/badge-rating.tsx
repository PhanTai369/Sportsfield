import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface BadgeRatingProps {
  rating: number;
  reviewCount?: number;
  className?: string;
}

export function BadgeRating({
  rating,
  reviewCount,
  className,
}: BadgeRatingProps) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {Array(fullStars)
        .fill(0)
        .map((_, i) => (
          <Star
            key={`full-${i}`}
            className="w-4 h-4 fill-yellow-400 text-yellow-400"
          />
        ))}
      {hasHalfStar && (
        <div className="relative">
          <Star className="w-4 h-4 text-yellow-400" />
          <div className="absolute top-0 left-0 overflow-hidden w-[50%]">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
          </div>
        </div>
      )}
      {Array(emptyStars)
        .fill(0)
        .map((_, i) => (
          <Star key={`empty-${i}`} className="w-4 h-4 text-yellow-400" />
        ))}
      {reviewCount !== undefined && (
        <span className="text-sm text-gray-500">({reviewCount} đánh giá)</span>
      )}
    </div>
  );
}
