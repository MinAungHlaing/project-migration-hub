export function ks(n: number | string | null | undefined) {
  const v = Number(n ?? 0);
  return `${v.toLocaleString("en-US", { maximumFractionDigits: 0 })} Ks`;
}

export function num(n: number | string | null | undefined) {
  const v = Number(n ?? 0);
  return v.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

/** "GTM - 0230" -> "GTM-0230" (same rule as the original product URLs and photo names). */
export function productSlug(productId: string | null | undefined) {
  return (productId ?? "").replace(/\s+/g, "").toUpperCase();
}

export function imageUrl(path: string | null | undefined, version?: string | null) {
  if (!path) return null;
  return `/api/images/${encodeURIComponent(path)}${version ? `?v=${encodeURIComponent(version)}` : ""}`;
}

export function dateTime(v: string | null | undefined) {
  if (!v) return "";
  const d = new Date(v);
  return d.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function dateOnly(v: string | null | undefined, locale = "en-GB") {
  if (!v) return "";
  return new Date(v).toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" });
}

export function timeAgo(v: string | null | undefined, language: "en" | "my" = "en") {
  if (!v) return "";
  const s = Math.max(0, (Date.now() - new Date(v).getTime()) / 1000);
  if (s < 60) return language === "my" ? "ယခုလေးတင်" : "just now";
  if (s < 3600) return language === "my" ? `${Math.floor(s / 60)} မိနစ်ခန့်က` : `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return language === "my" ? `${Math.floor(s / 3600)} နာရီခန့်က` : `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 30) return language === "my" ? `${Math.floor(s / 86400)} ရက်ခန့်က` : `${Math.floor(s / 86400)}d ago`;
  return dateOnly(v, language === "my" ? "my-MM" : "en-GB");
}

export function repLabel(code?: string | null, name?: string | null) {
  const c = (code ?? "").trim();
  const n = (name ?? "").trim();
  return c && n ? `${c} (${n})` : c || n;
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
