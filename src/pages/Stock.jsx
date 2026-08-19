import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, Upload } from "lucide-react";
import { fetchAllProducts, updateProduct } from "../lib/mockProducts";
import { parseCsvRecords, toCsv, downloadCsv } from "../lib/csv";
import SearchInput from "../components/SearchInput";
import TableStateRow from "../components/TableStateRow";
import Modal from "../components/Modal";
import FormError from "../components/FormError";
import CsvDropzone from "../components/CsvDropzone";

const CSV_COLUMNS = ["id", "name", "category", "stockQuantity", "inStock"];

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

async function importStockCsv(file, products) {
  const text = await readFileAsText(file);
  const records = parseCsvRecords(text);
  const byId = new Map(products.map((p) => [p._id, p]));
  const byName = new Map(products.map((p) => [p.name.trim().toLowerCase(), p]));

  let updated = 0;
  let skipped = 0;

  for (const record of records) {
    const product =
      (record.id && byId.get(record.id)) ||
      (record.name && byName.get(record.name.trim().toLowerCase()));

    if (!product || record.stockquantity === undefined) {
      skipped++;
      continue;
    }

    const qty = Number(record.stockquantity) || 0;
    const inStock = record.instock
      ? ["true", "1", "yes"].includes(record.instock.toLowerCase())
      : qty > 0;

    await updateProduct(product._id, { stockQuantity: qty, inStock });
    updated++;
  }

  return { updated, skipped };
}

export default function Stock() {
  const [search, setSearch] = useState("");
  const [drafts, setDrafts] = useState({});
  const [importing, setImporting] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["stock-products"],
    queryFn: fetchAllProducts,
  });

  const mutation = useMutation({
    mutationFn: ({ id, body }) => updateProduct(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const importMutation = useMutation({
    mutationFn: async (file) => {
      const all = await fetchAllProducts();
      return importStockCsv(file, all);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const products = (data ?? []).filter((p) =>
    p.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  async function handleExport() {
    const all = data ?? (await fetchAllProducts());
    const rows = all.map((p) => ({ ...p, id: p._id }));
    downloadCsv("stock.csv", toCsv(rows, CSV_COLUMNS));
  }

  function openImport() {
    importMutation.reset();
    setImporting(true);
  }

  function draftFor(product) {
    return (
      drafts[product._id]?.stockQuantity ?? String(product.stockQuantity ?? 0)
    );
  }

  function setDraft(id, value) {
    setDrafts((d) => ({ ...d, [id]: { stockQuantity: value } }));
  }

  function applyAdjustment(product) {
    const qty = Number(draftFor(product)) || 0;
    mutation.mutate({
      id: product._id,
      body: { stockQuantity: qty, inStock: qty > 0 },
    });
  }

  function toggleInStock(product) {
    mutation.mutate({
      id: product._id,
      body: { inStock: !product.inStock },
    });
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Stock</h2>
          <p className="mt-1 text-sm text-gray-500">
            Adjust stock quantities and availability for existing products.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 border border-gray-300 text-gray-700 text-sm px-4 py-2 hover:bg-gray-50"
          >
            <Download size={14} /> Export CSV
          </button>
          <button
            onClick={openImport}
            className="flex items-center gap-1.5 border border-gray-300 text-gray-700 text-sm px-4 py-2 hover:bg-gray-50"
          >
            <Upload size={14} /> Import CSV
          </button>
        </div>
      </div>

      <div className="mt-4 max-w-sm">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search products…"
        />
      </div>

      <div className="mt-4 bg-white border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
              <th className="px-4 py-2.5 font-medium">Name</th>
              <th className="px-4 py-2.5 font-medium">Category</th>
              <th className="px-4 py-2.5 font-medium">Quantity</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading && <TableStateRow colSpan={5}>Loading…</TableStateRow>}
            {!isLoading && products.length === 0 && (
              <TableStateRow colSpan={5}>No products found.</TableStateRow>
            )}
            {products.map((p) => (
              <tr key={p._id} className="hover:bg-gray-50">
                <td className="px-4 py-2.5 text-gray-900">{p.name}</td>
                <td className="px-4 py-2.5 text-gray-600">{p.category}</td>
                <td className="px-4 py-2.5">
                  <input
                    type="number"
                    min="0"
                    className="w-24 border border-gray-300 px-2 py-1 text-sm outline-none focus:border-primary"
                    value={draftFor(p)}
                    onChange={(e) => setDraft(p._id, e.target.value)}
                  />
                </td>
                <td className="px-4 py-2.5">
                  <button
                    onClick={() => toggleInStock(p)}
                    className={`px-2 py-0.5 text-xs ${
                      p.inStock
                        ? "bg-green-50 text-green-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {p.inStock ? "In Stock" : "Out of Stock"}
                  </button>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <button
                    onClick={() => applyAdjustment(p)}
                    disabled={mutation.isPending}
                    className="text-sm bg-primary text-white px-3 py-1.5 hover:opacity-90 disabled:opacity-60"
                  >
                    Save
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {importing && (
        <Modal title="Import Stock CSV" onClose={() => setImporting(false)}>
          <p className="text-sm text-gray-500 mb-3">
            Columns: id or name (to match an existing product), stockQuantity,
            inStock (optional, defaults to quantity &gt; 0).
          </p>
          <CsvDropzone
            label="Click to select CSV file"
            disabled={importMutation.isPending}
            onFileSelect={(file) => importMutation.mutate(file)}
          />
          <FormError message={importMutation.error?.message} />
          {importMutation.isPending && (
            <p className="mt-3 text-sm text-gray-500">Importing…</p>
          )}
          {importMutation.isSuccess && (
            <p className="mt-3 text-sm text-green-700">
              Updated {importMutation.data.updated} product(s)
              {importMutation.data.skipped > 0
                ? `, skipped ${importMutation.data.skipped} unmatched row(s)`
                : ""}
              .
            </p>
          )}
          <div className="flex justify-end pt-4">
            <button
              type="button"
              onClick={() => setImporting(false)}
              className="text-sm text-gray-600 border border-gray-300 px-4 py-2 hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
