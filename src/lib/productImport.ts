import * as XLSX from "xlsx";

export interface ParsedProductRow {
  name: string;
  price: number;
  stock_quantity: number;
  sku: string | null;
}

function normalizeKey(key: string) {
  return key.trim().toLowerCase().replace(/\s+/g, "_");
}

export async function parseProductFile(file: File): Promise<ParsedProductRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });

  const rows: ParsedProductRow[] = [];
  for (const raw of rawRows) {
    const normalized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(raw)) {
      normalized[normalizeKey(key)] = value;
    }

    const name = normalized.name != null ? String(normalized.name).trim() : "";
    const price = Number(normalized.price);
    const stockRaw = normalized.stock_quantity ?? normalized.stock ?? normalized.quantity;
    const stock_quantity = stockRaw == null || stockRaw === "" ? 0 : Number(stockRaw);
    const skuRaw = normalized.sku;
    const sku = skuRaw != null && String(skuRaw).trim() !== "" ? String(skuRaw).trim() : null;

    if (!name || Number.isNaN(price) || Number.isNaN(stock_quantity)) continue;
    rows.push({ name, price, stock_quantity, sku });
  }
  return rows;
}
