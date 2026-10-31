import type { ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export function PageHeader({ title, sub, actions }: { title: string; sub?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">{title}</h1>
        {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-soft">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function Panel({ title, children, actions, className = "" }: { title?: string; children: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border bg-card shadow-soft ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-2 border-b px-5 py-3">
          {title && <h2 className="font-display font-semibold">{title}</h2>}
          {actions}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

const TONES: Record<string, string> = {
  New: "bg-warning/15 text-foreground", Fulfilled: "bg-accent text-accent-foreground", Cancelled: "bg-destructive/10 text-destructive",
  "In Stock": "bg-accent text-accent-foreground", "Out Of Stock": "bg-destructive/10 text-destructive",
  draft: "bg-warning/15 text-foreground", approved: "bg-accent text-accent-foreground",
  open: "bg-warning/15 text-foreground", partial: "bg-secondary text-secondary-foreground", received: "bg-accent text-accent-foreground", cancelled: "bg-destructive/10 text-destructive",
  pending: "bg-warning/15 text-foreground", verified: "bg-accent text-accent-foreground",
  delivered: "bg-accent text-accent-foreground", failed: "bg-destructive/10 text-destructive",
};

export function Badge({ children }: { children: string }) {
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${TONES[children] ?? "bg-muted text-muted-foreground"}`}>{children}</span>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-10 text-center text-sm text-muted-foreground">{children}</p>;
}

export function Table({ head, children }: { head: ReactNode[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">{head.map((h, i) => <th key={i} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
        <tbody className="[&>tr]:border-b [&>tr:last-child]:border-0 [&_td]:px-3 [&_td]:py-2.5">{children}</tbody>
      </table>
    </div>
  );
}

/** Mutation helper: runs, toasts, and refreshes the given query keys. */
export function useAction<T>(fn: (v: T) => Promise<unknown>, opts: { success?: string; invalidate?: unknown[][]; onDone?: (r: unknown) => void } = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (r) => {
      if (opts.success) toast.success(opts.success);
      opts.invalidate?.forEach((k) => qc.invalidateQueries({ queryKey: k }));
      opts.onDone?.(r);
    },
    onError: (e) => toast.error((e as Error).message),
  });
}
