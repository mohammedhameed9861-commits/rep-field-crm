import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import * as XLSX from "xlsx";
import { GripVertical, Plus, Minus, Printer, FileDown, Send } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { FullScreenLoader } from "@/components/FullScreenLoader";
import { Button } from "@/components/Button";
import type { BatchStatus, Invoice, InvoiceBatch, InvoiceBatchItem, Profile } from "@/types/database";

type InvoiceRow = Invoice & { shops: { shop_name: string } | null; visits: { visit_time: string } | null };

const STATUS_STYLES: Record<BatchStatus, string> = {
  draft: "bg-gray-200 text-gray-600",
  prepared: "bg-amber-100 text-amber-700",
  sent: "bg-green-100 text-green-700",
};

export function InvoicePrep() {
  const { t } = useTranslation();
  const [reps, setReps] = useState<Profile[] | null>(null);
  const [repId, setRepId] = useState<string>("");
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [batches, setBatches] = useState<InvoiceBatch[]>([]);
  const [batchItems, setBatchItems] = useState<InvoiceBatchItem[]>([]);
  const [loadingRepData, setLoadingRepData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragOverBatch, setDragOverBatch] = useState(false);
  const [dragOverPending, setDragOverPending] = useState(false);
  const [printBatchId, setPrintBatchId] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("*")
      .eq("role", "rep")
      .order("full_name")
      .then(({ data }) => {
        setReps(data ?? []);
        if (data && data.length > 0) setRepId(data[0].id);
      });
  }, []);

  function refreshRepData(id: string) {
    setLoadingRepData(true);
    Promise.all([
      supabase
        .from("invoices")
        .select("*, shops(shop_name), visits(visit_time)")
        .eq("rep_id", id)
        .order("created_at", { ascending: false }),
      supabase.from("invoice_batches").select("*").eq("rep_id", id).order("created_at", { ascending: false }),
    ]).then(async ([invoicesRes, batchesRes]) => {
      const invoiceRows = (invoicesRes.data as InvoiceRow[]) ?? [];
      const batchRows = batchesRes.data ?? [];
      setInvoices(invoiceRows);
      setBatches(batchRows);
      if (batchRows.length > 0) {
        const { data: itemRows } = await supabase
          .from("invoice_batch_items")
          .select("*")
          .in(
            "batch_id",
            batchRows.map((b) => b.id),
          );
        setBatchItems(itemRows ?? []);
      } else {
        setBatchItems([]);
      }
      setLoadingRepData(false);
    });
  }

  useEffect(() => {
    if (repId) refreshRepData(repId);
  }, [repId]);

  const invoiceById = useMemo(() => new Map(invoices.map((inv) => [inv.id, inv])), [invoices]);
  const draftBatch = useMemo(() => batches.find((b) => b.status === "draft") ?? null, [batches]);
  const batchedInvoiceIds = useMemo(() => new Set(batchItems.map((i) => i.invoice_id)), [batchItems]);
  const draftItemIds = useMemo(
    () => (draftBatch ? batchItems.filter((i) => i.batch_id === draftBatch.id).map((i) => i.invoice_id) : []),
    [batchItems, draftBatch],
  );
  const draftInvoices = draftItemIds.map((id) => invoiceById.get(id)).filter((v): v is InvoiceRow => !!v);
  const pendingInvoices = invoices.filter((inv) => !batchedInvoiceIds.has(inv.id));
  const historyBatches = batches.filter((b) => b.status !== "draft");

  function batchInvoices(batchId: string): InvoiceRow[] {
    return batchItems
      .filter((i) => i.batch_id === batchId)
      .map((i) => invoiceById.get(i.invoice_id))
      .filter((v): v is InvoiceRow => !!v);
  }

  async function addToBatch(invoiceId: string) {
    setBusy(true);
    setError(null);
    try {
      let batchId = draftBatch?.id;
      if (!batchId) {
        const { data: newBatch, error: createErr } = await supabase
          .from("invoice_batches")
          .insert({ rep_id: repId })
          .select()
          .single();
        if (createErr || !newBatch) throw new Error(createErr?.message);
        batchId = newBatch.id;
      }
      const { error: itemErr } = await supabase.from("invoice_batch_items").insert({ batch_id: batchId, invoice_id: invoiceId });
      if (itemErr) throw new Error(itemErr.message);
      refreshRepData(repId);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("invoicePrep.errorAdd"));
    } finally {
      setBusy(false);
    }
  }

  async function removeFromBatch(invoiceId: string) {
    setBusy(true);
    setError(null);
    try {
      const { error: deleteErr } = await supabase.from("invoice_batch_items").delete().eq("invoice_id", invoiceId);
      if (deleteErr) throw new Error(deleteErr.message);
      refreshRepData(repId);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("invoicePrep.errorRemove"));
    } finally {
      setBusy(false);
    }
  }

  async function markPrepared() {
    if (!draftBatch) return;
    setBusy(true);
    setError(null);
    try {
      const { error: updateErr } = await supabase
        .from("invoice_batches")
        .update({ status: "prepared", prepared_at: new Date().toISOString() })
        .eq("id", draftBatch.id);
      if (updateErr) throw new Error(updateErr.message);
      refreshRepData(repId);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("invoicePrep.errorPrepare"));
    } finally {
      setBusy(false);
    }
  }

  async function markSent(batchId: string) {
    setBusy(true);
    setError(null);
    try {
      const { error: updateErr } = await supabase
        .from("invoice_batches")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", batchId);
      if (updateErr) throw new Error(updateErr.message);
      refreshRepData(repId);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("invoicePrep.errorSent"));
    } finally {
      setBusy(false);
    }
  }

  function exportBatch(batch: InvoiceBatch) {
    const items = batchInvoices(batch.id);
    const rows = items.map((inv) => ({
      [t("invoicePrep.invoiceNumber")]: inv.invoice_number,
      [t("invoicePrep.shop")]: inv.shops?.shop_name ?? "",
      [t("invoicePrep.date")]: inv.visits?.visit_time ? new Date(inv.visits.visit_time).toLocaleDateString() : "",
      [t("invoicePrep.amount")]: inv.amount,
    }));
    rows.push({
      [t("invoicePrep.invoiceNumber")]: "",
      [t("invoicePrep.shop")]: "",
      [t("invoicePrep.date")]: t("invoicePrep.total"),
      [t("invoicePrep.amount")]: items.reduce((s, i) => s + i.amount, 0),
    });
    const sheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Invoices");
    const repName = reps?.find((r) => r.id === repId)?.full_name ?? "rep";
    XLSX.writeFile(workbook, `invoices-${repName}-${batch.id.slice(0, 8)}.xlsx`);
  }

  function printBatch(batchId: string) {
    setPrintBatchId(batchId);
    setTimeout(() => {
      window.print();
      setPrintBatchId(null);
    }, 50);
  }

  if (!reps) return <FullScreenLoader />;

  const printBatchData = printBatchId ? batches.find((b) => b.id === printBatchId) : null;
  const printItems = printBatchId ? batchInvoices(printBatchId) : [];
  const printRepName = reps.find((r) => r.id === repId)?.full_name ?? "";

  return (
    <div className="space-y-6 print:hidden">
      <h2 className="text-xl font-bold text-gray-900">{t("invoicePrep.title")}</h2>

      <select
        value={repId}
        onChange={(e) => setRepId(e.target.value)}
        className="tap-target w-full max-w-sm rounded-xl border border-gray-300 px-4 sm:w-auto"
      >
        {reps.map((rep) => (
          <option key={rep.id} value={rep.id}>
            {rep.full_name}
          </option>
        ))}
      </select>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loadingRepData ? (
        <FullScreenLoader />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverPending(true);
            }}
            onDragLeave={() => setDragOverPending(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOverPending(false);
              const id = e.dataTransfer.getData("text/plain");
              if (id) removeFromBatch(id);
            }}
            className={`rounded-xl border p-4 ${dragOverPending ? "border-brand-500 bg-brand-50" : "border-gray-200 bg-white"}`}
          >
            <h3 className="mb-3 font-semibold text-gray-900">{t("invoicePrep.pending")}</h3>
            <ul className="space-y-2">
              {pendingInvoices.map((inv) => (
                <li
                  key={inv.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", inv.id)}
                  className="flex cursor-grab items-center gap-2 rounded-lg border border-gray-200 p-2"
                >
                  <GripVertical className="h-4 w-4 shrink-0 text-gray-300" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">{inv.shops?.shop_name}</p>
                    <p className="text-xs text-gray-500">
                      #{inv.invoice_number} · {inv.amount.toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => addToBatch(inv.id)}
                    disabled={busy}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-300"
                    aria-label={t("invoicePrep.add")}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </li>
              ))}
              {pendingInvoices.length === 0 && <p className="text-sm text-gray-400">{t("invoicePrep.noPending")}</p>}
            </ul>
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverBatch(true);
            }}
            onDragLeave={() => setDragOverBatch(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOverBatch(false);
              const id = e.dataTransfer.getData("text/plain");
              if (id) addToBatch(id);
            }}
            className={`rounded-xl border p-4 ${dragOverBatch ? "border-brand-500 bg-brand-50" : "border-gray-200 bg-white"}`}
          >
            <h3 className="mb-3 font-semibold text-gray-900">{t("invoicePrep.batch")}</h3>
            <ul className="space-y-2">
              {draftInvoices.map((inv) => (
                <li
                  key={inv.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", inv.id)}
                  className="flex cursor-grab items-center gap-2 rounded-lg border border-gray-200 p-2"
                >
                  <GripVertical className="h-4 w-4 shrink-0 text-gray-300" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">{inv.shops?.shop_name}</p>
                    <p className="text-xs text-gray-500">
                      #{inv.invoice_number} · {inv.amount.toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => removeFromBatch(inv.id)}
                    disabled={busy}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-300"
                    aria-label={t("invoicePrep.remove")}
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                </li>
              ))}
              {draftInvoices.length === 0 && <p className="text-sm text-gray-400">{t("invoicePrep.noBatchItems")}</p>}
            </ul>

            {draftInvoices.length > 0 && draftBatch && (
              <div className="mt-4 space-y-2 border-t border-gray-100 pt-3">
                <div className="flex items-center justify-between font-semibold text-gray-900">
                  <span>{t("invoicePrep.total")}</span>
                  <span>{draftInvoices.reduce((s, i) => s + i.amount, 0).toLocaleString()}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={markPrepared} disabled={busy} className="w-auto px-4">
                    {t("invoicePrep.markPrepared")}
                  </Button>
                  <button
                    onClick={() => printBatch(draftBatch.id)}
                    className="tap-target flex items-center gap-2 rounded-xl border border-gray-300 px-4 text-gray-700"
                  >
                    <Printer className="h-4 w-4" /> {t("invoicePrep.print")}
                  </button>
                  <button
                    onClick={() => exportBatch(draftBatch)}
                    className="tap-target flex items-center gap-2 rounded-xl border border-gray-300 px-4 text-gray-700"
                  >
                    <FileDown className="h-4 w-4" /> {t("invoicePrep.exportExcel")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h3 className="mb-3 font-semibold text-gray-900">{t("invoicePrep.history")}</h3>
        {historyBatches.length === 0 && <p className="text-sm text-gray-400">{t("invoicePrep.noHistory")}</p>}
        <ul className="divide-y divide-gray-100">
          {historyBatches.map((batch) => {
            const items = batchInvoices(batch.id);
            const total = items.reduce((s, i) => s + i.amount, 0);
            return (
              <li key={batch.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[batch.status]}`}>
                      {t(`invoicePrep.status${batch.status[0].toUpperCase()}${batch.status.slice(1)}`)}
                    </span>
                    <span className="text-sm text-gray-500">{t("invoicePrep.itemCount", { count: items.length })}</span>
                  </div>
                  <p className="mt-1 text-sm text-gray-700">
                    {t("invoicePrep.total")}: {total.toLocaleString()}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => printBatch(batch.id)}
                    className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1 text-sm"
                  >
                    <Printer className="h-4 w-4" /> {t("invoicePrep.print")}
                  </button>
                  <button
                    onClick={() => exportBatch(batch)}
                    className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1 text-sm"
                  >
                    <FileDown className="h-4 w-4" /> {t("invoicePrep.exportExcel")}
                  </button>
                  {batch.status === "prepared" && (
                    <button
                      onClick={() => markSent(batch.id)}
                      disabled={busy}
                      className="flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-1 text-sm text-white"
                    >
                      <Send className="h-4 w-4" /> {t("invoicePrep.markSent")}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {printBatchData && (
        <div className="hidden print:block">
          <h1 className="text-xl font-bold">{t("invoicePrep.printedFor", { name: printRepName })}</h1>
          {printBatchData.prepared_at && (
            <p className="text-sm text-gray-500">
              {t("invoicePrep.printedOn", { date: new Date(printBatchData.prepared_at).toLocaleString() })}
            </p>
          )}
          <table className="mt-4 w-full border-collapse text-start text-sm">
            <thead>
              <tr className="border-b border-gray-400">
                <th className="py-2 text-start">{t("invoicePrep.invoiceNumber")}</th>
                <th className="py-2 text-start">{t("invoicePrep.shop")}</th>
                <th className="py-2 text-start">{t("invoicePrep.date")}</th>
                <th className="py-2 text-start">{t("invoicePrep.amount")}</th>
              </tr>
            </thead>
            <tbody>
              {printItems.map((inv) => (
                <tr key={inv.id} className="border-b border-gray-200">
                  <td className="py-1">{inv.invoice_number}</td>
                  <td className="py-1">{inv.shops?.shop_name}</td>
                  <td className="py-1">{inv.visits?.visit_time ? new Date(inv.visits.visit_time).toLocaleDateString() : ""}</td>
                  <td className="py-1">{inv.amount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 font-semibold">
            {t("invoicePrep.total")}: {printItems.reduce((s, i) => s + i.amount, 0).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}
