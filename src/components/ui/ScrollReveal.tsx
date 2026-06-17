import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  animation?: "fade-in" | "slide-up" | "scale-in";
  delay?: number;
  duration?: number;
  once?: boolean;
  threshold?: number;
}

export const ScrollReveal = ({
  children,
  className,
  animation = "slide-up",
  delay = 0,
  duration = 700,
  once = true,
  threshold = 0.1,
}: ScrollRevealProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const domRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once && domRef.current) {
            observer.unobserve(domRef.current);
          }
        } else if (!once) {
          setIsVisible(false);
        }
      },
      { threshold }
    );

    const currentRef = domRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [once, threshold]);

  const animationClasses = {
    "fade-in": "opacity-0 data-[visible=true]:animate-fade-in",
    "slide-up": "opacity-0 translate-y-8 data-[visible=true]:animate-slide-up",
    "scale-in": "opacity-0 scale-95 data-[visible=true]:animate-scale-in",
  };

  return (
    <div
      ref={domRef}
      data-visible={isVisible}
      className={cn(isVisible ? animationClasses[animation] : "opacity-0", className)}
      style={{
        animationDelay: `${delay}ms`,
        animationDuration: `${duration}ms`,
        animationFillMode: "forwards",
      }}
    >
      {children}
    </div>
  );
};
