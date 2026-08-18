import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, Pencil, Search, Download, Check } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import PaginationBar from "../components/PaginationBar";
import { parseCsvLines } from "../lib/csv";
import { useProductsPage } from "../hooks/useProductsPage";
import Modal from "../components/Modal";
import SearchInput from "../components/SearchInput";
import TableStateRow from "../components/TableStateRow";
import CsvDropzone from "../components/CsvDropzone";

const BADGE_CLS =
  "border border-gray-400 text-gray-800 px-2 py-0.5 text-xs uppercase tracking-wide";

const PER_PAGE = 30;

function parseCsvRows(text) {
  return parseCsvLines(text, ["supplier", "quantity", "code"])
    .map((cols) => ({
      supplierCode: cols[0] ?? "",
      quantity: Number.parseInt(cols[1] ?? "0") || 0,
    }))
    .filter((r) => r.supplierCode && r.quantity > 0);
}

function downloadTemplate() {
  const csv = "supplierCode,quantity\nSUPP001,50\nSUPP002,30\n";
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "stock_update_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function Stock() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [editStock, setEditStock] = useState("");

  const [csvModal, setCsvModal] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [selectedSupplier, setSelectedSupplier] = useState("");

  const [pendingFile, setPendingFile] = useState(null);
  const [reviewModal, setReviewModal] = useState(false);
  const [csvRows, setCsvRows] = useState([]);
  const [reviewSaving, setReviewSaving] = useState(false);
  const [reviewErr, setReviewErr] = useState("");
  const searchTimerRef = useRef(null);

  const { data, isLoading, error } = useProductsPage(
    "stock-products",
    page,
    search,
    PER_PAGE,
  );

  const products = data?.products ?? [];
  const total = data?.total ?? 0;

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => api.get("/admin/suppliers"),
    enabled: csvModal,
  });

  const saveStockMutation = useMutation({
    mutationFn: ({ id, stock }) =>
      api.put(`/products/${id}`, { stock }),
    onSuccess: (_, { id, stock }) => {
      queryClient.setQueryData(
        ["stock-products", page, search],
        (prev) =>
          prev
            ? {
                ...prev,
                products: prev.products.map((p) =>
                  p.id === id ? { ...p, stock } : p,
                ),
              }
            : prev,
      );
      setEditingId(null);
    },
  });

  const totalPages = Math.ceil(total / PER_PAGE);

  function openCsvModal() {
    setImportResult(null);
    setSelectedSupplier("");
    setCsvModal(true);
  }

  async function handleFileSelect(file) {
    const text = await file.text();
    const parsed = parseCsvRows(text);
    if (parsed.length === 0) {
      alert("No valid rows found. Expected format: supplierCode,quantity");
      return;
    }

    let allMaps = [];
    try {
      allMaps = await api.get("/admin/supplier-maps");
    } catch {
      /* allMaps stays [] */
    }
    const supplierMaps = allMaps.filter(
      (m) => m.supplier.id === selectedSupplier,
    );

    const rows = parsed.map((r, i) => {
      const match = supplierMaps.find((m) => m.supplierCode === r.supplierCode);
      return {
        id: String(i),
        supplierCode: r.supplierCode,
        quantity: r.quantity,
        existingMapId: match?.id ?? null,
        existingProductName: match?.product.name ?? null,
        selectedProduct: null,
        productSearch: "",
        productOptions: [],
        searchLoading: false,
        showDropdown: false,
      };
    });

    setPendingFile(file);
    setCsvRows(rows);
    setReviewErr("");
    setReviewModal(true);
  }

  async function fetchRowProducts(rowId, value) {
    setCsvRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, searchLoading: true } : r)),
    );
    try {
      const data = await api.get(
        `/products?search=${encodeURIComponent(value)}&limit=10`,
      );
      setCsvRows((prev) =>
        prev.map((r) =>
          r.id === rowId
            ? {
                ...r,
                searchLoading: false,
                productOptions: data.products,
                showDropdown: true,
              }
            : r,
        ),
      );
    } catch {
      setCsvRows((prev) =>
        prev.map((r) =>
          r.id === rowId
            ? { ...r, searchLoading: false, productOptions: [] }
            : r,
        ),
      );
    }
  }

  function updateRowSearch(rowId, value) {
    setCsvRows((prev) =>
      prev.map((r) =>
        r.id === rowId
          ? {
              ...r,
              productSearch: value,
              selectedProduct: null,
              showDropdown: false,
            }
          : r,
      ),
    );
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!value.trim()) return;
    searchTimerRef.current = setTimeout(() => {
      void fetchRowProducts(rowId, value);
    }, 300);
  }

  function selectRowProduct(rowId, product) {
    setCsvRows((prev) =>
      prev.map((r) =>
        r.id === rowId
          ? {
              ...r,
              selectedProduct: product,
              productSearch:
                product.name + (product.sku ? ` (${product.sku})` : ""),
              showDropdown: false,
              productOptions: [],
            }
          : r,
      ),
    );
  }

  async function handleReviewImport() {
    if (!pendingFile || !selectedSupplier) return;
    setReviewErr("");

    const unmappedMissing = csvRows.filter(
      (r) => r.existingMapId === null && r.selectedProduct === null,
    );
    if (unmappedMissing.length > 0) {
      setReviewErr(
        `Select a product for ${unmappedMissing.length} unmapped code${unmappedMissing.length > 1 ? "s" : ""} or remove those rows from the CSV`,
      );
      return;
    }

    setReviewSaving(true);
    try {
      const newMappings = csvRows.filter(
        (r) => r.existingMapId === null && r.selectedProduct !== null,
      );
      for (const row of newMappings) {
        await api.post("/admin/supplier-maps", {
          supplierId: selectedSupplier,
          supplierCode: row.supplierCode,
          productId: row.selectedProduct.id,
          notes: null,
        });
      }

      const fd = new FormData();
      fd.append("file", pendingFile);
      setReviewModal(false);
      const result = await api.upload(
        `/admin/stock/csv?supplierId=${encodeURIComponent(selectedSupplier)}`,
        fd,
      );
      setImportResult(result);
      queryClient.invalidateQueries({ queryKey: ["stock-products"] });
    } catch (err) {
      setReviewErr(err instanceof Error ? err.message : "Import failed");
    } finally {
      setReviewSaving(false);
    }
  }

  const unmappedCount = csvRows.filter((r) => r.existingMapId === null).length;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <h2 className="text-xl font-semibold text-gray-900">
          Stock Management
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-300 px-3 py-2 hover:bg-gray-50"
          >
            <Download size={13} /> Template
          </button>
          <button
            onClick={openCsvModal}
            className="flex items-center gap-1.5 text-xs bg-primary text-white px-3 py-2"
          >
            <Upload size={13} /> Upload Stock CSV
          </button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 px-4 py-3 mb-5 text-xs text-blue-700">
        <strong>Stock CSV format:</strong> columns{" "}
        <code className="bg-blue-100 px-1">supplierCode, quantity</code>
        {". "}The quantity is <em>added</em> to existing stock. Supplier codes
        must be configured in{" "}
        <a href="/provider-maps" className="underline font-medium">
          Suppliers
        </a>
        {"."}
      </div>

      <SearchInput
        className="mb-4 max-w-xs"
        placeholder="Search products…"
        value={search}
        onChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
      />

      {error && <p className="text-sm text-red-500 mb-4">{error.message}</p>}

      <div className="bg-white border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">
                  Product
                </th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">
                  SKU
                </th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">
                  Category
                </th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">
                  Stock
                </th>
                {user?.role === "admin" && (
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 w-36">
                    Set Stock
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(() => {
                if (isLoading) {
                  return <TableStateRow colSpan={5}>Loading…</TableStateRow>;
                }
                if (products.length === 0) {
                  return (
                    <TableStateRow colSpan={5}>No products found</TableStateRow>
                  );
                }
                return products.map((p) => {
                  return (
                    <tr key={p.id} className="hover:bg-gray-50/60">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {p.name}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 font-mono">
                        {p.sku ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-sm">
                        {p.category}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block ${BADGE_CLS}`}>
                          {p.stock} units
                        </span>
                      </td>
                      {user?.role === "admin" && (
                        <td className="px-4 py-3">
                          {editingId === p.id ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                min="0"
                                value={editStock}
                                onChange={(e) => setEditStock(e.target.value)}
                                className="w-20 border border-gray-300 px-2 py-1 text-sm outline-none focus:border-primary"
                                autoFocus
                              />
                              <button
                                onClick={() =>
                                  saveStockMutation.mutate({
                                    id: p.id,
                                    stock: Number.parseInt(editStock) || 0,
                                  })
                                }
                                disabled={saveStockMutation.isPending}
                                className="text-xs bg-primary text-white px-2.5 py-1 disabled:opacity-60"
                              >
                                {saveStockMutation.isPending ? "…" : "Save"}
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="text-xs text-gray-400 hover:text-gray-600 px-1"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingId(p.id);
                                setEditStock(String(p.stock));
                              }}
                              className="flex items-center gap-1 text-xs text-gray-400 hover:text-primary border border-gray-300 px-2.5 py-1.5 hover:border-primary/30 hover:bg-primary/5"
                            >
                              <Pencil size={11} /> Edit
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>

        <PaginationBar
          page={page}
          totalPages={totalPages}
          total={total}
          perPage={PER_PAGE}
          onPageChange={setPage}
        />
      </div>

      {/* CSV Upload Modal */}
      {csvModal && (
        <Modal title="Upload Stock CSV" onClose={() => setCsvModal(false)}>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Upload a CSV with your supplier codes and quantities to record
              stock received. The quantity will be <strong>added</strong> to the
              current stock level.
            </p>
            <div className="bg-gray-50 p-3 text-xs text-gray-500 font-mono leading-relaxed">
              Columns: supplierCode, quantity
              <br />
              Example: SUPP001, 50
            </div>

            <div>
              <label
                htmlFor="stockSupplier"
                className="block text-xs font-medium text-gray-600 mb-1"
              >
                Supplier *
              </label>
              <select
                id="stockSupplier"
                data-testid="supplier-select"
                value={selectedSupplier}
                onChange={(e) => setSelectedSupplier(e.target.value)}
                className="w-full border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary"
              >
                <option value="">— Select a supplier —</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              {suppliers.length === 0 && (
                <p className="text-xs text-gray-400 mt-1">
                  No suppliers found. Add one in Suppliers.
                </p>
              )}
            </div>

            {importResult && (
              <div className="bg-gray-50 p-3 text-sm">
                <p className="text-green-700 font-medium">
                  Updated: {importResult.updated} products
                </p>
                {importResult.errors.length > 0 && (
                  <div className="mt-2">
                    <p className="text-red-600 font-medium text-xs">
                      Errors ({importResult.errors.length}):
                    </p>
                    <ul className="mt-1 space-y-0.5 text-xs text-red-500 max-h-32 overflow-y-auto">
                      {importResult.errors.map((e) => (
                        <li key={e}>{e}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <CsvDropzone
              disabled={!selectedSupplier}
              onFileSelect={(file) => void handleFileSelect(file)}
            />
          </div>
        </Modal>
      )}

      {/* Mapping Review Modal */}
      {reviewModal && (
        <Modal
          size="xl"
          onClose={() => setReviewModal(false)}
          title={
            <div>
              Review Stock Import
              <p className="text-xs text-gray-500 mt-0.5 font-normal">
                {csvRows.length} row{csvRows.length !== 1 ? "s" : ""}
                {unmappedCount > 0 && (
                  <span className="text-amber-600">
                    {" "}
                    · {unmappedCount} unmapped — assign a product below
                  </span>
                )}
              </p>
            </div>
          }
          footer={
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                {reviewErr && (
                  <p className="text-xs text-red-600">{reviewErr}</p>
                )}
                {!reviewErr && unmappedCount > 0 && (
                  <p className="text-xs text-amber-600">
                    New mappings will be saved to Suppliers automatically.
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setReviewModal(false)}
                  className="text-sm text-gray-600 border border-gray-300 px-4 py-2 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => void handleReviewImport()}
                  disabled={reviewSaving}
                  className="text-sm bg-primary text-white px-4 py-2 disabled:opacity-60"
                >
                  {reviewSaving
                    ? "Importing…"
                    : `Import ${csvRows.length} row${csvRows.length !== 1 ? "s" : ""}`}
                </button>
              </div>
            </div>
          }
        >
          <table className="min-w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left font-medium text-gray-500 pb-2 pr-3 w-32">
                  Supplier Code
                </th>
                <th className="text-left font-medium text-gray-500 pb-2 pr-3 w-16">
                  Qty
                </th>
                <th className="text-left font-medium text-gray-500 pb-2">
                  Product Mapping
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {csvRows.map((row) => (
                <tr key={row.id} className="align-top">
                  <td className="py-3 pr-3 font-mono text-gray-800">
                    {row.supplierCode}
                  </td>
                  <td className="py-3 pr-3 text-gray-600">+{row.quantity}</td>
                  <td className="py-3">
                    {row.existingMapId ? (
                      <div className="flex items-center gap-1.5">
                        <Check size={12} className="text-green-500 shrink-0" />
                        <span className="text-gray-700">
                          {row.existingProductName}
                        </span>
                      </div>
                    ) : (
                      <div className="relative">
                        <div className="relative">
                          <Search
                            size={11}
                            className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400"
                          />
                          <input
                            className="w-full border border-amber-300 bg-amber-50 pl-6 pr-2 py-1 text-xs outline-none focus:border-primary focus:bg-white"
                            placeholder="Search product to map…"
                            value={row.productSearch}
                            onChange={(e) =>
                              updateRowSearch(row.id, e.target.value)
                            }
                            onFocus={() =>
                              row.productOptions.length > 0 &&
                              setCsvRows((prev) =>
                                prev.map((r) =>
                                  r.id === row.id
                                    ? { ...r, showDropdown: true }
                                    : r,
                                ),
                              )
                            }
                          />
                        </div>
                        {row.showDropdown && (
                          <div className="absolute z-10 top-full left-0 right-0 mt-0.5 bg-white border border-gray-200 max-h-36 overflow-y-auto">
                            {row.searchLoading ? (
                              <div className="px-3 py-2 text-xs text-gray-400">
                                Searching…
                              </div>
                            ) : row.productOptions.length === 0 ? (
                              <div className="px-3 py-2 text-xs text-gray-400">
                                No products found
                              </div>
                            ) : (
                              row.productOptions.map((p) => (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => selectRowProduct(row.id, p)}
                                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 flex items-center justify-between gap-2"
                                >
                                  <span className="text-gray-900">
                                    {p.name}
                                  </span>
                                  {p.sku && (
                                    <span className="text-gray-400 font-mono shrink-0">
                                      {p.sku}
                                    </span>
                                  )}
                                </button>
                              ))
                            )}
                          </div>
                        )}
                        {row.selectedProduct && (
                          <p className="text-green-600 text-[10px] mt-0.5">
                            Will create mapping → {row.selectedProduct.name}
                          </p>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Modal>
      )}
    </div>
  );
}
