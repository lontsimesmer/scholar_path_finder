import { cva } from "class-variance-authority";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/92 shadow-medium hover:shadow-strong hover:-translate-y-0.5",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-primary/20 bg-white/70 text-primary shadow-soft backdrop-blur-sm hover:border-primary/40 hover:bg-primary/8 hover:text-primary",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "text-foreground/75 hover:bg-secondary/80 hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        hero: "bg-primary text-primary-foreground hover:bg-primary/92 shadow-glow hover:shadow-strong hover:-translate-y-0.5 text-base",
        heroOutline: "border border-primary-foreground/35 bg-white/8 text-primary-foreground shadow-soft backdrop-blur-sm hover:bg-white/12 text-base",
        accent: "bg-accent text-accent-foreground hover:bg-accent/92 shadow-medium hover:shadow-strong hover:-translate-y-0.5",
      },
      size: {
        default: "h-11 px-5 py-2.5",
        sm: "h-9 rounded-full px-4",
        lg: "h-12 rounded-full px-8",
        xl: "h-14 rounded-full px-10 text-lg",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);
