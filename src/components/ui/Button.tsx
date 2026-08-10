import type { ReactNode } from "react";

export function Button({
  children,
  onClick,
  variant = "secondary",
  size = "md",
  title,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
  title?: string;
  disabled?: boolean;
}) {
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 border-transparent",
    secondary: "bg-white text-slate-700 hover:bg-slate-50 border-slate-300",
    ghost:
      "bg-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100 border-transparent",
    danger: "bg-white text-red-600 hover:bg-red-50 border-red-200",
  };
  const sizes = { sm: "px-2.5 py-1 text-xs", md: "px-3.5 py-2 text-sm" };
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg border font-medium transition ${variants[variant]} ${sizes[size]} disabled:cursor-not-allowed disabled:opacity-40`}
    >
      {children}
    </button>
  );
}
