// Excel catalog import rules (ported from the original validate_excel / validate_pricing_rows).

export const REQUIRED_COLUMNS = ["Product ID", "Product Name", "UPC", "Unit", "Retail", "Wholesale", "Category", "Status", "Base Price", "B2C", "Supplier"];

export type RawRow = Record<string, unknown>;
const blank = (v: unknown) => v == null || String(v).trim() === "";
const titleCase = (s: string) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

export function missingColumns(headers: string[]) {
  return REQUIRED_COLUMNS.filter((c) => !headers.includes(c));
}

export function duplicateIds(rows: RawRow[]) {
  const seen = new Map<string, number>();
  rows.forEach((r) => {
    const id = String(r["Product ID"] ?? "").replace(/\s+/g, "").toLowerCase();
    if (id) seen.set(id, (seen.get(id) ?? 0) + 1);
  });
  return [...seen.entries()].filter(([, n]) => n > 1).map(([id]) => id.toUpperCase());
}

/** Only In Stock rows must have valid pricing data; Out Of Stock rows are exempt. */
export function pricingErrors(rows: RawRow[]) {
  const errors: string[] = [];
  for (const r of rows) {
    const label = `${String(r["Product ID"] ?? "").trim() || "(blank ID)"} (${String(r["Product Name"] ?? "").trim() || "unnamed"})`;
    const status = titleCase(String(r["Status"] ?? "In Stock").trim() || "In Stock");
    if (status !== "In Stock") continue;
    if (blank(r["Supplier"])) errors.push(`${label}: Supplier is required for In Stock products.`);
    if (blank(r["Base Price"])) { errors.push(`${label}: Base Price is required for In Stock products.`); continue; }
    const base = Number(r["Base Price"]);
    if (!isFinite(base)) { errors.push(`${label}: Base Price (${r["Base Price"]}) is not a valid number.`); continue; }
    if (base <= 0) { errors.push(`${label}: Base Price must be greater than 0.`); continue; }
    if (blank(r["B2C"])) errors.push(`${label}: B2C price is required for In Stock products.`);
    else {
      const b2c = Number(r["B2C"]);
      if (!isFinite(b2c)) errors.push(`${label}: B2C (${r["B2C"]}) is not a valid number.`);
      else if (b2c < base) errors.push(`${label}: B2C (${b2c}) is below Base Price (${base}).`);
    }
    for (const f of ["Retail", "Wholesale"]) {
      if (blank(r[f])) continue;
      const v = Number(r[f]);
      if (isFinite(v) && v < base) errors.push(`${label}: ${f} (${v}) is below Base Price (${base}).`);
    }
  }
  return errors;
}

export function normaliseRows(rows: RawRow[], hasDescription: boolean, hasSupplier: boolean) {
  const n = (v: unknown, d = 0) => (blank(v) || !isFinite(Number(v)) ? d : Number(v));
  return rows.map((r) => ({
    product_id: String(r["Product ID"] ?? "").trim(),
    product_name: String(r["Product Name"] ?? ""),
    upc: Math.trunc(n(r["UPC"])),
    unit: blank(r["Unit"]) ? "-" : String(r["Unit"]),
    retail: n(r["Retail"]),
    wholesale: n(r["Wholesale"]),
    category: blank(r["Category"]) ? "General" : String(r["Category"]),
    status: titleCase(String(r["Status"] ?? "In Stock").trim() || "In Stock"),
    description: hasDescription ? String(r["Description"] ?? "") : undefined,
    supplier: hasSupplier ? String(r["Supplier"] ?? "") : undefined,
    base_price: blank(r["Base Price"]) ? null : n(r["Base Price"]),
    b2c: blank(r["B2C"]) ? null : n(r["B2C"]),
  }));
}
