import { type ButtonHTMLAttributes, forwardRef } from "react";
import clsx from "clsx";

type Variant = "primary" | "secondary" | "danger" | "ghost";

const variants: Record<Variant, string> = {
  primary: "bg-brand-600 text-white active:bg-brand-700 disabled:bg-gray-300",
  secondary: "bg-gray-100 text-gray-900 active:bg-gray-200 disabled:bg-gray-100 disabled:text-gray-400",
  danger: "bg-red-600 text-white active:bg-red-700 disabled:bg-gray-300",
  ghost: "bg-transparent text-brand-600 active:bg-brand-50",
};

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }
>(function Button({ variant = "primary", className, ...props }, ref) {
  return (
    <button
      ref={ref}
      className={clsx(
        "tap-target w-full rounded-xl px-4 text-base font-semibold transition-colors disabled:cursor-not-allowed",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
});
