import { describe, expect, it } from "vitest";
import { duplicateIds, missingColumns, normaliseRows, pricingErrors } from "@/lib/catalog-import";
import { hashPassword, verifyPassword } from "@/lib/crypto";
import { productSlug, repLabel } from "@/lib/format";

const row = (o: Record<string, unknown>) => ({ "Product ID": "GTM - 0001", "Product Name": "Rice", Status: "In Stock", Supplier: "ACME", "Base Price": 100, B2C: 120, Retail: 130, Wholesale: 110, ...o });

describe("catalog import rules", () => {
  it("requires supplier for In Stock rows", () => {
    expect(pricingErrors([row({ Supplier: "" })]).some((e) => e.includes("Supplier is required"))).toBe(true);
  });
  it("rejects B2C below base price", () => {
    expect(pricingErrors([row({ B2C: 90 })]).some((e) => e.includes("B2C (90) is below Base Price (100)"))).toBe(true);
  });
  it("rejects retail or wholesale below base price", () => {
    expect(pricingErrors([row({ Wholesale: 99 })]).some((e) => e.includes("Wholesale (99) is below Base Price"))).toBe(true);
  });
  it("rejects base price of zero", () => {
    expect(pricingErrors([row({ "Base Price": 0 })])[0]).toContain("greater than 0");
  });
  it("exempts Out Of Stock rows from pricing checks", () => {
    expect(pricingErrors([row({ Status: "out of stock", Supplier: "", "Base Price": null })])).toEqual([]);
  });
  it("flags duplicate product IDs ignoring spaces and case", () => {
    expect(duplicateIds([row({}), row({ "Product ID": "gtm-0001" })])).toEqual(["GTM-0001"]);
  });
  it("reports missing required columns", () => {
    expect(missingColumns(["Product ID", "Product Name"])).toContain("Base Price");
  });
  it("defaults blank unit to '-' and category to General", () => {
    const [n] = normaliseRows([row({ Unit: null, Category: "" })], false, true);
    expect(n?.unit).toBe("-");
    expect(n?.category).toBe("General");
  });
});

describe("identity helpers", () => {
  it("builds rep labels as 'CODE (Name)'", () => {
    expect(repLabel("T-1", "Myu Latt Aung")).toBe("T-1 (Myu Latt Aung)");
  });
  it("builds product URL slugs without spaces", () => {
    expect(productSlug("GTM - 0230")).toBe("GTM-0230");
  });
  it("verifies field app passwords only when they match", async () => {
    const h = await hashPassword("correct horse");
    expect(await verifyPassword("correct horse", h)).toBe(true);
    expect(await verifyPassword("wrong", h)).toBe(false);
  });
});
