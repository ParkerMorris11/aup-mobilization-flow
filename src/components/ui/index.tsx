import clsx from "clsx";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "rounded-card border border-alpine/10 bg-white p-6 shadow-card",
        className
      )}
    >
      {children}
    </div>
  );
}

export function Badge({
  children,
  variant = "default",
  className,
}: {
  children: ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info";
  className?: string;
}) {
  const styles = {
    default: "bg-salt-dark text-alpine",
    success: "bg-emerald-50 text-decision-allowed border border-emerald-200",
    warning: "bg-amber-50 text-decision-caution border border-amber-200",
    danger: "bg-red-50 text-decision-prohibited border border-red-200",
    info: "bg-blue-50 text-decision-escalate border border-blue-200",
  };
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        styles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

export function Button({
  children,
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
}) {
  const styles = {
    primary: "bg-alpine text-white hover:bg-alpine-light",
    secondary:
      "border border-alpine/20 bg-white text-alpine hover:border-alpine/40 hover:bg-salt-dark",
    ghost: "text-alpine/70 hover:bg-salt-dark hover:text-alpine",
  };
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-pill px-5 py-2.5 text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50",
        styles[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function SectionTitle({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={clsx(
        "font-display text-2xl font-medium tracking-tight text-alpine",
        className
      )}
    >
      {children}
    </h2>
  );
}

export function DecisionBadge({
  decision,
}: {
  decision: "allowed" | "caution" | "prohibited" | "escalate";
}) {
  const labels = {
    allowed: "Allowed",
    caution: "Caution",
    prohibited: "Prohibited",
    escalate: "Escalate",
  };
  const variants = {
    allowed: "success" as const,
    caution: "warning" as const,
    prohibited: "danger" as const,
    escalate: "info" as const,
  };
  return <Badge variant={variants[decision]}>{labels[decision]}</Badge>;
}
