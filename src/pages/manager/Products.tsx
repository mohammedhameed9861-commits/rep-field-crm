import { useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Upload, ImagePlus, Package } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { parseProductFile, type ParsedProductRow } from "@/lib/productImport";
import { compressPhoto } from "@/lib/imageCompress";
import { FullScreenLoader } from "@/components/FullScreenLoader";
import { Button } from "@/components/Button";
import type { Product } from "@/types/database";

async function uploadProductImage(file: File): Promise<string> {
  const compressed = await compressPhoto(file);
  const path = `${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage
    .from("product-images")
    .upload(path, compressed, { contentType: "image/jpeg" });
  if (error) throw error;
  return supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
}

export function Products() {
  const { t } = useTranslation();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({ name: "", sku: "", price: "", stock_quantity: "" });
  const [formImage, setFormImage] = useState<File | null>(null);
  const [formImagePreview, setFormImagePreview] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsedRows, setParsedRows] = useState<ParsedProductRow[] | null>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  const [uploadingImageId, setUploadingImageId] = useState<string | null>(null);
  const rowImageInputRef = useRef<HTMLInputElement>(null);
  const [rowImageTargetId, setRowImageTargetId] = useState<string | null>(null);

  function refresh() {
    supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => setProducts(data ?? []));
  }

  useEffect(refresh, []);

  function handleFormImageChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFormImage(file);
    setFormImagePreview(URL.createObjectURL(file));
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCreating(true);
    try {
      const image_url = formImage ? await uploadProductImage(formImage) : null;
      const { error: insertErr } = await supabase.from("products").insert({
        name: form.name.trim(),
        sku: form.sku.trim() || null,
        price: Number(form.price),
        stock_quantity: Number(form.stock_quantity) || 0,
        image_url,
      });
      if (insertErr) throw new Error(insertErr.message);
      setForm({ name: "", sku: "", price: "", stock_quantity: "" });
      setFormImage(null);
      setFormImagePreview(null);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("products.errorCreate"));
    } finally {
      setCreating(false);
    }
  }

  async function handleFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setImportSuccess(null);
    setParsing(true);
    try {
      const rows = await parseProductFile(file);
      setParsedRows(rows);
    } catch {
      setError(t("products.errorParse"));
      setParsedRows(null);
    } finally {
      setParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleConfirmImport() {
    if (!parsedRows || parsedRows.length === 0) return;
    setImporting(true);
    setError(null);
    try {
      // Only touch image_url if the file actually had an image column —
      // otherwise a stock/price-only re-import would wipe out photos
      // added manually through the table below.
      const hasImageColumn = parsedRows.some((r) => r.image_url !== null);
      const payload = hasImageColumn
        ? parsedRows
        : parsedRows.map((r) => ({ name: r.name, price: r.price, stock_quantity: r.stock_quantity, sku: r.sku }));
      const { error: upsertErr } = await supabase
        .from("products")
        .upsert(payload, { onConflict: "sku" });
      if (upsertErr) throw new Error(upsertErr.message);
      setImportSuccess(t("products.importSuccess", { count: parsedRows.length }));
      setParsedRows(null);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("products.errorImport"));
    } finally {
      setImporting(false);
    }
  }

  async function handleFieldUpdate(productId: string, field: "price" | "stock_quantity", value: string) {
    const num = Number(value);
    if (Number.isNaN(num)) return;
    const patch = field === "price" ? { price: num } : { stock_quantity: num };
    const { error: updateErr } = await supabase.from("products").update(patch).eq("id", productId);
    if (updateErr) setError(updateErr.message);
    else refresh();
  }

  async function handleToggleActive(product: Product) {
    const { error: updateErr } = await supabase
      .from("products")
      .update({ active: !product.active })
      .eq("id", product.id);
    if (updateErr) setError(updateErr.message);
    else refresh();
  }

  function triggerRowImagePicker(productId: string) {
    setRowImageTargetId(productId);
    rowImageInputRef.current?.click();
  }

  async function handleRowImageChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const productId = rowImageTargetId;
    if (!file || !productId) return;
    setUploadingImageId(productId);
    setError(null);
    try {
      const image_url = await uploadProductImage(file);
      const { error: updateErr } = await supabase.from("products").update({ image_url }).eq("id", productId);
      if (updateErr) throw new Error(updateErr.message);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("products.errorImage"));
    } finally {
      setUploadingImageId(null);
      setRowImageTargetId(null);
      if (rowImageInputRef.current) rowImageInputRef.current.value = "";
    }
  }

  if (!products) return <FullScreenLoader />;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">{t("products.title")}</h2>

      <form
        onSubmit={handleCreate}
        className="grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-white p-5 sm:grid-cols-2"
      >
        <h3 className="col-span-full font-semibold text-gray-900">{t("products.addProduct")}</h3>

        <div className="col-span-full flex items-center gap-3">
          <label className="flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-gray-300 bg-gray-50">
            {formImagePreview ? (
              <img src={formImagePreview} alt="" className="h-full w-full object-cover" />
            ) : (
              <ImagePlus className="h-6 w-6 text-gray-400" />
            )}
            <input type="file" accept="image/*" className="hidden" onChange={handleFormImageChosen} />
          </label>
          <span className="text-sm text-gray-500">{t("products.addImage")}</span>
        </div>

        <input
          required
          placeholder={t("products.name")}
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className="tap-target rounded-xl border border-gray-300 px-4"
        />
        <input
          placeholder={t("products.sku")}
          value={form.sku}
          onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
          className="tap-target rounded-xl border border-gray-300 px-4"
        />
        <input
          required
          type="number"
          min="0"
          step="0.01"
          placeholder={t("products.price")}
          value={form.price}
          onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
          className="tap-target rounded-xl border border-gray-300 px-4"
        />
        <input
          type="number"
          min="0"
          step="1"
          placeholder={t("products.stock")}
          value={form.stock_quantity}
          onChange={(e) => setForm((f) => ({ ...f, stock_quantity: e.target.value }))}
          className="tap-target rounded-xl border border-gray-300 px-4"
        />
        <Button type="submit" disabled={creating} className="sm:col-span-2">
          {creating ? t("products.creating") : t("products.addProduct")}
        </Button>
      </form>

      <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="font-semibold text-gray-900">{t("products.bulkImport")}</h3>
        <p className="text-sm text-gray-500">{t("products.bulkImportHint")}</p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={handleFileChosen}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={parsing}
          className="tap-target flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 px-4 text-gray-600 disabled:opacity-50"
        >
          <Upload className="h-5 w-5" /> {parsing ? t("products.parsing") : t("products.chooseFile")}
        </button>

        {parsedRows && parsedRows.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700">
              {t("products.previewTitle", { count: parsedRows.length })}
            </p>
            <div className="max-h-60 overflow-y-auto rounded-lg border border-gray-200">
              <table className="w-full text-start text-sm">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="px-3 py-2">{t("products.image")}</th>
                    <th className="px-3 py-2">{t("products.name")}</th>
                    <th className="px-3 py-2">{t("products.sku")}</th>
                    <th className="px-3 py-2">{t("products.price")}</th>
                    <th className="px-3 py-2">{t("products.stock")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {parsedRows.slice(0, 50).map((row, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2">
                        {row.image_url ? (
                          <img src={row.image_url} alt="" className="h-8 w-8 rounded object-cover" />
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-2">{row.name}</td>
                      <td className="px-3 py-2 text-gray-500">{row.sku ?? "—"}</td>
                      <td className="px-3 py-2">{row.price}</td>
                      <td className="px-3 py-2">{row.stock_quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button onClick={handleConfirmImport} disabled={importing}>
              {importing ? t("products.importing") : t("products.confirmImport", { count: parsedRows.length })}
            </Button>
          </div>
        )}
        {importSuccess && <p className="text-sm text-green-600">{importSuccess}</p>}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <input
        ref={rowImageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleRowImageChosen}
      />

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full min-w-[650px] text-start text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-gray-500">
            <tr>
              <th className="px-4 py-3">{t("products.image")}</th>
              <th className="px-4 py-3">{t("products.name")}</th>
              <th className="px-4 py-3">{t("products.sku")}</th>
              <th className="px-4 py-3">{t("products.price")}</th>
              <th className="px-4 py-3">{t("products.stock")}</th>
              <th className="px-4 py-3">{t("products.active")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {products.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => triggerRowImagePicker(p.id)}
                    disabled={uploadingImageId === p.id}
                    className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50"
                    title={p.image_url ? t("products.changeImage") : t("products.addImage")}
                  >
                    {uploadingImageId === p.id ? (
                      <span className="text-[10px] text-gray-400">{t("products.uploadingImage")}</span>
                    ) : p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                    ) : (
                      <Package className="h-5 w-5 text-gray-300" />
                    )}
                  </button>
                </td>
                <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                <td className="px-4 py-3 text-gray-500">{p.sku ?? "—"}</td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    defaultValue={p.price}
                    step="0.01"
                    onBlur={(e) => handleFieldUpdate(p.id, "price", e.target.value)}
                    className="w-24 rounded-lg border border-gray-300 px-2 py-1"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    defaultValue={p.stock_quantity}
                    step="1"
                    onBlur={(e) => handleFieldUpdate(p.id, "stock_quantity", e.target.value)}
                    className="w-24 rounded-lg border border-gray-300 px-2 py-1"
                  />
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleToggleActive(p)}
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      p.active ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {p.active ? t("products.active") : t("products.inactive")}
                  </button>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                  {t("products.noProductsYet")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
