import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";
import footerLogo from "@/assets/footer-logo.png";

interface BrandMarkProps {
  tone?: "light" | "dark";
  size?: "sm" | "md" | "lg";
  className?: string;
  imageClassName?: string;
}

const shellClasses = {
  light:
    "border border-white/80 bg-[linear-gradient(145deg,_rgba(255,255,255,0.98),_rgba(237,244,255,0.92))] shadow-[0_18px_45px_-24px_rgba(29,52,115,0.45)]",
  dark:
    "border border-white/12 bg-[linear-gradient(145deg,_rgba(255,255,255,0.14),_rgba(255,255,255,0.04))] shadow-[0_18px_55px_-26px_rgba(0,0,0,0.6)] backdrop-blur-sm",
} as const;

const sizeClasses = {
  sm: "h-12 w-12 rounded-[1rem] p-1.5",
  md: "h-14 w-14 rounded-[1.15rem] p-2",
  lg: "h-16 w-16 rounded-[1.3rem] p-2.5",
} as const;

const BrandMark = ({
  tone = "light",
  size = "md",
  className,
  imageClassName,
}: BrandMarkProps) => {
  const src = tone === "dark" ? footerLogo : logo;

  return (
    <div
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden",
        shellClasses[tone],
        sizeClasses[size],
        className,
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0",
          tone === "light"
            ? "bg-[radial-gradient(circle_at_top_left,_rgba(63,98,214,0.16),_transparent_45%),radial-gradient(circle_at_bottom_right,_rgba(246,186,74,0.12),_transparent_38%)]"
            : "bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.12),_transparent_45%),radial-gradient(circle_at_bottom_right,_rgba(246,186,74,0.18),_transparent_40%)]",
        )}
      />
      <img
        src={src}
        alt="Power Prestation"
        className={cn(
          "relative h-full w-full rounded-[0.95rem] object-contain",
          tone === "light" ? "drop-shadow-[0_10px_20px_rgba(29,52,115,0.15)]" : "drop-shadow-[0_10px_24px_rgba(0,0,0,0.35)]",
          imageClassName,
        )}
      />
    </div>
  );
};

export default BrandMark;
