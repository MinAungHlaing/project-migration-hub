import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { importCatalog } from "@/lib/admin.functions";
import { PageHeader, Panel, useAction } from "@/components/admin/kit";
import { duplicateIds, missingColumns, normaliseRows, pricingErrors, REQUIRED_COLUMNS, type RawRow } from "@/lib/catalog-import";

export const Route = createFileRoute("/_authenticated/admin/upload")({ component: UploadPage });

function UploadPage() {
  const [rows, setRows] = useState<RawRow[] | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [replace, setReplace] = useState(true);
  const [result, setResult] = useState<{ count: number; warnings: string[] } | null>(null);
  const run = useAction(() => {
    const hasD = headers.includes("Description"), hasS = headers.includes("Supplier");
    return importCatalog({ data: { rows: normaliseRows(rows!, hasD, hasS), replace, hasDescription: hasD, hasSupplier: hasS } });
  }, { success: "Catalog imported.", invalidate: [["admin-products"], ["catalog"], ["dashboard"]], onDone: (r) => { setResult(r as typeof result); setRows(null); } });

  async function onFile(f: File) {
    setResult(null);
    try {
      const wb = XLSX.read(await f.arrayBuffer());
      const ws = wb.Sheets["Product Catalog"];
      if (!ws) { setRows(null); setErrors(['The workbook needs a sheet named "Product Catalog".']); return; }
      const data = XLSX.utils.sheet_to_json<RawRow>(ws, { defval: null });
      const hdr = (XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 })[0] ?? []).map((h) => String(h).trim());
      const errs: string[] = [];
      const miss = missingColumns(hdr);
      if (miss.length) errs.push(`Missing columns: ${miss.join(", ")}`);
      const dups = duplicateIds(data);
      if (dups.length) errs.push(`Duplicate Product IDs in the sheet: ${dups.join(", ")}`);
      errs.push(...pricingErrors(data));
      setHeaders(hdr); setRows(data); setErrors(errs);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <>
      <PageHeader title="Upload catalog" sub="Bulk import or refresh products from Excel. Existing products are matched by Product ID; price changes are logged automatically." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="1. Choose file">
          <input type="file" accept=".xlsx,.xls" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-primary-foreground" />
          <p className="mt-3 text-xs text-muted-foreground">Sheet “Product Catalog” with columns: {REQUIRED_COLUMNS.join(", ")}. Description is optional — leave it out to keep existing descriptions.</p>
          <label className="mt-4 flex items-center gap-2 text-sm"><Checkbox checked={replace} onCheckedChange={(c) => setReplace(!!c)} />Mark products missing from this file as Out Of Stock</label>
        </Panel>
        <Panel title="2. Check & import">
          {!rows && !result && <p className="text-sm text-muted-foreground">Pick a file to check it.</p>}
          {rows && (
            <>
              <p className="text-sm">{rows.length} rows found.</p>
              {errors.length > 0 ? (
                <div className="mt-3 max-h-72 overflow-y-auto rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  <p className="mb-1 font-semibold">Fix these before importing:</p>
                  <ul className="list-disc space-y-0.5 pl-5">{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
                </div>
              ) : <p className="mt-2 text-sm text-success">All checks passed.</p>}
              <Button className="mt-4" disabled={errors.length > 0 || run.isPending} onClick={() => run.mutate(undefined)}>{run.isPending ? "Importing…" : `Import ${rows.length} rows`}</Button>
            </>
          )}
          {result && (
            <div className="text-sm">
              <p className="font-semibold">Imported {result.count} rows.</p>
              {result.warnings.length > 0 && <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">{result.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>}
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
