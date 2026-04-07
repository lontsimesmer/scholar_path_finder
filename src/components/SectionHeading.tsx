import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  badge: string;
  title: string;
  highlight: string;
  subtitle: string;
  align?: "left" | "center";
  inverse?: boolean;
  className?: string;
}

const SectionHeading = ({
  badge,
  title,
  highlight,
  subtitle,
  align = "center",
  inverse = false,
  className,
}: SectionHeadingProps) => {
  return (
    <div
      className={cn(
        "space-y-5",
        align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-2xl",
        className,
      )}
    >
      <span
        className={cn(
          "section-kicker",
          align === "center" ? "mx-auto justify-center text-center" : "justify-start text-left",
          inverse
            ? "border-white/15 bg-white/8 text-primary-foreground/85"
            : "border-primary/10 bg-white/70 text-secondary-foreground shadow-soft",
        )}
      >
        <span className="eyebrow-dot" />
        {badge}
      </span>

      <div className="space-y-4">
        <h2 className={cn("section-title", inverse && "text-navy-foreground")}>
          {title}
          <span className={cn(inverse ? "text-accent" : "text-primary")}> {highlight}</span>
        </h2>
        <p className={cn("section-copy", inverse && "text-navy-foreground/70")}>{subtitle}</p>
      </div>
    </div>
  );
};

export default SectionHeading;
