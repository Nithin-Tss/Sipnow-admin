import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Upload, Check, Download } from "lucide-react";
import { api } from "../lib/api";
import { inputCls } from "../lib/ui";
import Modal from "../components/Modal";
import { parseCsvLines } from "../lib/csv";
import TableStateRow from "../components/TableStateRow";
import SearchInput from "../components/SearchInput";
import FormError from "../components/FormError";

function downloadTemplate() {
  const csv =
    "supplierName,supplierCode,sku,notes\nAcme Wines,ACME001,SKU001,\nAcme Wines,ACME002,SKU002,Shiraz\n";
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "supplier_mappings_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function parseMappingCsv(text) {
  return parseCsvLines(text, ["supplier", "sku", "code"])
    .map((cols) => ({
      supplierName: cols[0] ?? "",
      supplierCode: cols[1] ?? "",
      sku: cols[2] ?? "",
      notes: cols[3] ?? "",
    }))
    .filter((r) => r.supplierName && r.supplierCode && r.sku);
}

export default function ProviderMaps() {
  const queryClient = useQueryClient();

  const [addMapModal, setAddMapModal] = useState(false);
  const [mapSupplierId, setMapSupplierId] = useState("");
  const [supplierCode, setSupplierCode] = useState("");
  const [notes, setNotes] = useState("");
  const [formErr, setFormErr] = useState("");

  const [addSupplierModal, setAddSupplierModal] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [supplierErr, setSupplierErr] = useState("");

  const [productSearch, setProductSearch] = useState("");
  const [productOptions, setProductOptions] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  const csvFileRef = useRef(null);
  const [csvModal, setCsvModal] = useState(false);
  const [reviewRows, setReviewRows] = useState([]);
  const [csvSaving, setCsvSaving] = useState(false);
  const [csvErr, setCsvErr] = useState("");
  const [savingNewCat, setSavingNewCat] = useState(null);

  const {
    data: maps = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["supplier-maps"],
    queryFn: () => api.get("/admin/supplier-maps"),
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => api.get("/admin/suppliers"),
  });

  const { data: catTree = [] } = useQuery({
    queryKey: ["catalogue"],
    queryFn: () => api.get("/admin/catalogue"),
  });

  const addSupplierMutation = useMutation({
    mutationFn: (name) => api.post("/admin/suppliers", { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      setAddSupplierModal(false);
    },
    onError: (err) => setSupplierErr(err.message),
  });

  const deleteSupplierMutation = useMutation({
    mutationFn: (id) => api.delete(`/admin/suppliers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["supplier-maps"] });
    },
  });

  const addMapMutation = useMutation({
    mutationFn: (data) => api.post("/admin/supplier-maps", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-maps"] });
      setAddMapModal(false);
    },
    onError: (err) => setFormErr(err.message),
  });

  const deleteMapMutation = useMutation({
    mutationFn: (id) => api.delete(`/admin/supplier-maps/${id}`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["supplier-maps"] }),
  });

  const searchTimer = useRef(null);

  async function fetchProductOptions(value) {
    setSearchLoading(true);
    try {
      const data = await api.get(
        `/products?search=${encodeURIComponent(value)}&limit=10`,
      );
      setProductOptions(data.products);
      setShowDropdown(true);
    } catch {
      setProductOptions([]);
    } finally {
      setSearchLoading(false);
    }
  }

  function handleProductSearch(value) {
    setProductSearch(value);
    setSelectedProduct(null);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!value.trim()) {
      setProductOptions([]);
      setShowDropdown(false);
      return;
    }
    searchTimer.current = setTimeout(() => {
      void fetchProductOptions(value);
    }, 300);
  }

  function selectProduct(p) {
    setSelectedProduct(p);
    setProductSearch(p.name + (p.sku ? ` (${p.sku})` : ""));
    setShowDropdown(false);
  }

  function openAddMap() {
    setMapSupplierId("");
    setSupplierCode("");
    setNotes("");
    setProductSearch("");
    setSelectedProduct(null);
    setFormErr("");
    setAddMapModal(true);
  }

  function openAddSupplier() {
    setNewSupplierName("");
    setSupplierErr("");
    setAddSupplierModal(true);
  }

  function saveSupplier() {
    if (!newSupplierName.trim()) {
      setSupplierErr("Name is required");
      return;
    }
    setSupplierErr("");
    addSupplierMutation.mutate(newSupplierName.trim());
  }

  function saveMap() {
    if (!mapSupplierId) {
      setFormErr("Please select a supplier");
      return;
    }
    if (!selectedProduct) {
      setFormErr("Please select a product");
      return;
    }
    if (!supplierCode.trim()) {
      setFormErr("Supplier code is required");
      return;
    }
    setFormErr("");
    addMapMutation.mutate({
      supplierId: mapSupplierId,
      supplierCode: supplierCode.trim(),
      productId: selectedProduct.id,
      notes: notes.trim() || null,
    });
  }

  async function lookupSku(sku) {
    try {
      const data = await api.get(
        `/products?search=${encodeURIComponent(sku)}&limit=20`,
      );
      return data.products.find((p) => p.sku === sku) ?? null;
    } catch {
      return null;
    }
  }

  async function handleCsvUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const text = await file.text();
    const parsed = parseMappingCsv(text);
    if (parsed.length === 0) {
      alert(
        "No valid rows found. Expected format: supplierName,supplierCode,sku,notes",
      );
      return;
    }

    const initial = parsed.map((r, i) => ({
      id: String(i),
      supplierName: r.supplierName,
      supplierCode: r.supplierCode,
      sku: r.sku,
      notes: r.notes,
      checking: true,
      existingSupplierId: null,
      existingProductId: null,
      newProduct: { name: "", category: "", originalPrice: "" },
      showNewCat: false,
      newCatName: "",
    }));

    setReviewRows(initial);
    setCsvErr("");
    setCsvModal(true);

    const resolved = await Promise.all(
      parsed.map(async (r, i) => {
        const existingSupplier = suppliers.find(
          (s) => s.name.toLowerCase() === r.supplierName.toLowerCase(),
        );
        const existingProduct = await lookupSku(r.sku);
        return {
          id: String(i),
          existingSupplierId: existingSupplier?.id ?? null,
          existingProductId: existingProduct?.id ?? null,
          checking: false,
        };
      }),
    );

    setReviewRows((prev) =>
      prev.map((row) => {
        const r = resolved.find((x) => x.id === row.id);
        if (!r) return row;
        return {
          ...row,
          checking: false,
          existingSupplierId: r.existingSupplierId,
          existingProductId: r.existingProductId,
        };
      }),
    );
  }

  function updateNewProduct(rowId, field, value) {
    setReviewRows((prev) =>
      prev.map((r) =>
        r.id === rowId
          ? { ...r, newProduct: { ...r.newProduct, [field]: value } }
          : r,
      ),
    );
  }

  async function saveNewCat(rowId) {
    const row = reviewRows.find((r) => r.id === rowId);
    if (!row || !row.newCatName.trim()) return;
    setSavingNewCat(rowId);
    try {
      const created = await api.post("/admin/catalogue", {
        name: row.newCatName.trim(),
        parentId: null,
      });
      await queryClient.refetchQueries({ queryKey: ["catalogue"] });
      setReviewRows((prev) =>
        prev.map((r) =>
          r.id === rowId
            ? {
                ...r,
                newProduct: { ...r.newProduct, category: created.slug },
                showNewCat: false,
                newCatName: "",
              }
            : r,
        ),
      );
    } catch {
      /* keep open */
    } finally {
      setSavingNewCat(null);
    }
  }

  async function saveCsvMappings() {
    setCsvErr("");
    setCsvSaving(true);

    const missing = reviewRows.filter(
      (r) =>
        !r.checking &&
        r.existingProductId === null &&
        (!r.newProduct.name.trim() ||
          !r.newProduct.category.trim() ||
          !r.newProduct.originalPrice.trim()),
    );
    if (missing.length > 0) {
      setCsvErr(
        `Fill in Name, Category, and Price for all new products (${missing.length} row${missing.length > 1 ? "s" : ""} incomplete)`,
      );
      setCsvSaving(false);
      return;
    }

    try {
      const supplierNameToId = new Map(
        suppliers.map((s) => [s.name.toLowerCase(), s.id]),
      );
      const newSupplierNames = [
        ...new Set(
          reviewRows
            .filter((r) => r.existingSupplierId === null)
            .map((r) => r.supplierName),
        ),
      ];
      for (const name of newSupplierNames) {
        const created = await api.post("/admin/suppliers", { name });
        supplierNameToId.set(name.toLowerCase(), created.id);
      }

      const skuToId = new Map();
      for (const row of reviewRows) {
        if (row.existingProductId !== null) {
          skuToId.set(row.sku, row.existingProductId);
          continue;
        }
        const created = await api.post("/api/v1/products", {
          name: row.newProduct.name.trim(),
          category: row.newProduct.category.trim(),
          originalPrice: parseFloat(row.newProduct.originalPrice),
          sku: row.sku,
          imageUrl: "",
        });
        skuToId.set(row.sku, created.id);
      }

      for (const row of reviewRows) {
        const supplierId =
          row.existingSupplierId ??
          supplierNameToId.get(row.supplierName.toLowerCase());
        const productId = skuToId.get(row.sku);
        if (!supplierId || !productId) continue;
        await api.post("/admin/supplier-maps", {
          supplierId,
          supplierCode: row.supplierCode,
          productId,
          notes: row.notes || null,
        });
      }

      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["supplier-maps"] });
      setCsvModal(false);
      setReviewRows([]);
    } catch (err) {
      setCsvErr(err instanceof Error ? err.message : "Save failed");
    } finally {
      setCsvSaving(false);
    }
  }

  const miniInputCls =
    "border border-gray-300 px-2 py-1 text-xs outline-none focus:border-primary w-full";

  const allChecked = reviewRows.every((r) => !r.checking);
  const hasIncomplete = reviewRows.some(
    (r) =>
      r.existingProductId === null &&
      (!r.newProduct.name.trim() ||
        !r.newProduct.category.trim() ||
        !r.newProduct.originalPrice.trim()),
  );

  return (
    <div className="p-6">
      {/* Suppliers section */}
      <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
        <h2 className="text-xl font-semibold text-gray-900">Suppliers</h2>
        <button
          onClick={openAddSupplier}
          className="flex items-center gap-1.5 text-xs bg-primary text-white px-3 py-2"
        >
          <Plus size={13} /> Add Supplier
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Suppliers represent your stock providers. Select a supplier when
        uploading a stock CSV.
      </p>

      {error && <p className="text-sm text-red-500 mb-4">{error.message}</p>}

      <div className="bg-white border border-gray-100 overflow-hidden mb-8">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">
                  Supplier Name
                </th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">
                  Mappings
                </th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 w-20">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <TableStateRow colSpan={3}>Loading…</TableStateRow>
              ) : suppliers.length === 0 ? (
                <TableStateRow colSpan={3}>No suppliers yet.</TableStateRow>
              ) : (
                suppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50/60">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {s.name}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {maps.filter((m) => m.supplierId === s.id).length} codes
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => deleteSupplierMutation.mutate(s.id)}
                        disabled={
                          deleteSupplierMutation.isPending &&
                          deleteSupplierMutation.variables === s.id
                        }
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-60"
                        title="Delete supplier"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mappings section */}
      <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
        <h2 className="text-xl font-semibold text-gray-900">
          Supplier Code Mappings
        </h2>
        <div className="flex items-center gap-2">
          <input
            ref={csvFileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleCsvUpload}
          />
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-300 px-3 py-2 hover:bg-gray-50"
          >
            <Download size={13} /> Template
          </button>
          <button
            onClick={() => csvFileRef.current?.click()}
            className="flex items-center gap-1.5 text-xs border border-gray-300 text-gray-600 px-3 py-2 hover:bg-gray-50"
          >
            <Upload size={13} /> Upload CSV
          </button>
          <button
            onClick={openAddMap}
            className="flex items-center gap-1.5 text-xs bg-primary text-white px-3 py-2"
          >
            <Plus size={13} /> Add Mapping
          </button>
        </div>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Map each supplier's product codes to your catalogue. These codes are
        matched when importing a stock CSV. CSV format:{" "}
        <span className="font-mono text-xs bg-gray-100 px-1">
          supplierName,supplierCode,sku,notes
        </span>
      </p>

      <div className="bg-white border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">
                  Supplier
                </th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">
                  Supplier Code
                </th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">
                  Product
                </th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">
                  SKU
                </th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">
                  Notes
                </th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 w-20">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <TableStateRow colSpan={6}>Loading…</TableStateRow>
              ) : maps.length === 0 ? (
                <TableStateRow colSpan={6}>
                  No mappings yet. Add one to enable stock CSV uploads.
                </TableStateRow>
              ) : (
                maps.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50/60">
                    <td className="px-4 py-3 text-gray-700">
                      {m.supplier.name}
                    </td>
                    <td className="px-4 py-3 font-mono text-sm font-medium text-gray-900">
                      {m.supplierCode}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {m.product.name}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 font-mono">
                      {m.product.sku ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {m.notes ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => deleteMapMutation.mutate(m.id)}
                        disabled={
                          deleteMapMutation.isPending &&
                          deleteMapMutation.variables === m.id
                        }
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-60"
                        title="Delete mapping"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Supplier Modal */}
      {addSupplierModal && (
        <Modal title="Add Supplier" onClose={() => setAddSupplierModal(false)}>
          <div className="space-y-4">
            <FormError message={supplierErr} />
            <div>
              <label
                htmlFor="pm-supplier-name"
                className="block text-xs font-medium text-gray-600 mb-1"
              >
                Supplier Name *
              </label>
              <input
                id="pm-supplier-name"
                className={inputCls}
                placeholder="e.g. Acme Wines Pty Ltd"
                value={newSupplierName}
                onChange={(e) => setNewSupplierName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setAddSupplierModal(false)}
                className="text-sm text-gray-600 border border-gray-300 px-4 py-2 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={saveSupplier}
                disabled={addSupplierMutation.isPending}
                className="text-sm bg-primary text-white px-4 py-2 disabled:opacity-60"
              >
                {addSupplierMutation.isPending ? "Saving…" : "Add Supplier"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Mapping Modal */}
      {addMapModal && (
        <Modal
          title="Add Supplier Mapping"
          onClose={() => setAddMapModal(false)}
        >
          <div className="space-y-4">
            <FormError message={formErr} />
            <div>
              <label
                htmlFor="pm-map-supplier"
                className="block text-xs font-medium text-gray-600 mb-1"
              >
                Supplier *
              </label>
              <select
                id="pm-map-supplier"
                className={inputCls}
                value={mapSupplierId}
                onChange={(e) => setMapSupplierId(e.target.value)}
              >
                <option value="">— Select a supplier —</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="pm-supplier-code"
                className="block text-xs font-medium text-gray-600 mb-1"
              >
                Supplier Code *
              </label>
              <input
                id="pm-supplier-code"
                className={inputCls}
                placeholder="e.g. SUPP001"
                value={supplierCode}
                onChange={(e) => setSupplierCode(e.target.value)}
              />
              <p className="text-xs text-gray-400 mt-1">
                The code this supplier uses for the product
              </p>
            </div>
            <div className="relative">
              <label
                htmlFor="pm-product-search"
                className="block text-xs font-medium text-gray-600 mb-1"
              >
                Product *
              </label>
              <SearchInput
                id="pm-product-search"
                placeholder="Search product by name or SKU…"
                value={productSearch}
                onChange={handleProductSearch}
                onFocus={() =>
                  productOptions.length > 0 && setShowDropdown(true)
                }
              />
              {showDropdown && (
                <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-gray-200 max-h-48 overflow-y-auto">
                  {searchLoading ? (
                    <div className="px-3 py-2 text-xs text-gray-400">
                      Searching…
                    </div>
                  ) : productOptions.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-gray-400">
                      No products found
                    </div>
                  ) : (
                    productOptions.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => selectProduct(p)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between gap-2"
                      >
                        <span className="text-gray-900">{p.name}</span>
                        {p.sku && (
                          <span className="text-xs text-gray-400 font-mono shrink-0">
                            {p.sku}
                          </span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
              {selectedProduct && (
                <p className="text-xs text-green-600 mt-1">
                  Selected: {selectedProduct.name}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="pm-notes"
                className="block text-xs font-medium text-gray-600 mb-1"
              >
                Notes (optional)
              </label>
              <input
                id="pm-notes"
                className={inputCls}
                placeholder="e.g. Warehouse code"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setAddMapModal(false)}
                className="text-sm text-gray-600 border border-gray-300 px-4 py-2 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={saveMap}
                disabled={addMapMutation.isPending}
                className="text-sm bg-primary text-white px-4 py-2 disabled:opacity-60"
              >
                {addMapMutation.isPending ? "Saving…" : "Add Mapping"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* CSV Review Modal */}
      {csvModal && (
        <Modal
          size="2xl"
          onClose={() => {
            setCsvModal(false);
            setReviewRows([]);
          }}
          title={
            <div>
              Review CSV Import
              <p className="text-xs text-gray-500 mt-0.5 font-normal">
                {reviewRows.length} row{reviewRows.length !== 1 ? "s" : ""} —
                review before saving
              </p>
            </div>
          }
          footer={
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                {csvErr && <p className="text-xs text-red-600">{csvErr}</p>}
                {!csvErr && (
                  <p className="text-xs text-gray-400">
                    New products will be created with an empty image URL — edit
                    them in the Products page after import.
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    setCsvModal(false);
                    setReviewRows([]);
                  }}
                  className="text-sm text-gray-600 border border-gray-300 px-4 py-2 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={saveCsvMappings}
                  disabled={csvSaving || !allChecked || hasIncomplete}
                  className="text-sm bg-primary text-white px-4 py-2 disabled:opacity-60"
                >
                  {csvSaving
                    ? "Saving…"
                    : !allChecked
                      ? "Checking…"
                      : `Import ${reviewRows.length} mapping${reviewRows.length !== 1 ? "s" : ""}`}
                </button>
              </div>
            </div>
          }
        >
          <table className="min-w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left font-medium text-gray-500 pb-2 pr-3">
                  Supplier
                </th>
                <th className="text-left font-medium text-gray-500 pb-2 pr-3">
                  Code
                </th>
                <th className="text-left font-medium text-gray-500 pb-2 pr-3">
                  SKU
                </th>
                <th className="text-left font-medium text-gray-500 pb-2 pr-3">
                  Product
                </th>
                <th className="text-left font-medium text-gray-500 pb-2">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {reviewRows.map((row) => (
                <tr key={row.id} className="align-top">
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-1.5">
                      {row.checking ? (
                        <span className="text-gray-400">…</span>
                      ) : row.existingSupplierId ? (
                        <Check size={12} className="text-gray-400 shrink-0" />
                      ) : (
                        <span className="inline-block w-1.5 h-1.5 bg-gray-400 shrink-0 mt-0.5" />
                      )}
                      <span className="text-gray-700">{row.supplierName}</span>
                    </div>
                    {!row.checking && !row.existingSupplierId && (
                      <p className="text-gray-400 text-[10px] mt-0.5 ml-3">
                        Will be created
                      </p>
                    )}
                  </td>
                  <td className="py-3 pr-3 font-mono text-gray-800">
                    {row.supplierCode}
                  </td>
                  <td className="py-3 pr-3 font-mono text-gray-600">
                    {row.sku}
                  </td>
                  <td className="py-3 pr-3 min-w-70">
                    {row.checking ? (
                      <span className="text-gray-400 text-xs">Looking up…</span>
                    ) : row.existingProductId ? (
                      <div className="flex items-center gap-1.5">
                        <Check size={12} className="text-gray-400 shrink-0" />
                        <span className="text-gray-700">
                          Found in catalogue
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="inline-block w-1.5 h-1.5 bg-gray-400 shrink-0" />
                          <span className="text-gray-700 font-medium text-[10px]">
                            New product — fill in details
                          </span>
                        </div>
                        <input
                          className={miniInputCls}
                          placeholder="Product name *"
                          value={row.newProduct.name}
                          onChange={(e) =>
                            updateNewProduct(row.id, "name", e.target.value)
                          }
                        />
                        <div>
                          <div className="flex items-center gap-1">
                            <select
                              className={miniInputCls}
                              value={row.newProduct.category}
                              onChange={(e) =>
                                updateNewProduct(
                                  row.id,
                                  "category",
                                  e.target.value,
                                )
                              }
                            >
                              <option value="">— Category * —</option>
                              {catTree.map((c) => (
                                <option key={c.id} value={c.slug}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() =>
                                setReviewRows((prev) =>
                                  prev.map((r) =>
                                    r.id === row.id
                                      ? {
                                          ...r,
                                          showNewCat: !r.showNewCat,
                                          newCatName: "",
                                        }
                                      : r,
                                  ),
                                )
                              }
                              className="text-xs text-primary whitespace-nowrap flex items-center gap-0.5 shrink-0"
                            >
                              <span className="text-sm leading-none">+</span>{" "}
                              New
                            </button>
                          </div>
                          {row.showNewCat && (
                            <div className="flex gap-1 mt-1">
                              <input
                                autoFocus
                                value={row.newCatName}
                                onChange={(e) =>
                                  setReviewRows((prev) =>
                                    prev.map((r) =>
                                      r.id === row.id
                                        ? {
                                            ...r,
                                            newCatName: e.target.value,
                                          }
                                        : r,
                                    ),
                                  )
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter")
                                    void saveNewCat(row.id);
                                  if (e.key === "Escape")
                                    setReviewRows((prev) =>
                                      prev.map((r) =>
                                        r.id === row.id
                                          ? { ...r, showNewCat: false }
                                          : r,
                                      ),
                                    );
                                }}
                                placeholder="New category name…"
                                className="flex-1 border border-primary/40 px-2 py-1 text-xs outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => void saveNewCat(row.id)}
                                disabled={
                                  savingNewCat === row.id ||
                                  !row.newCatName.trim()
                                }
                                className="text-xs bg-primary text-white px-2 py-1 disabled:opacity-60 shrink-0"
                              >
                                {savingNewCat === row.id ? "…" : "Add"}
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setReviewRows((prev) =>
                                    prev.map((r) =>
                                      r.id === row.id
                                        ? { ...r, showNewCat: false }
                                        : r,
                                    ),
                                  )
                                }
                                className="text-xs text-gray-400 hover:text-gray-600 px-1"
                              >
                                ✕
                              </button>
                            </div>
                          )}
                        </div>
                        <input
                          className={miniInputCls}
                          placeholder="Price * (e.g. 9.99)"
                          value={row.newProduct.originalPrice}
                          onChange={(e) =>
                            updateNewProduct(
                              row.id,
                              "originalPrice",
                              e.target.value,
                            )
                          }
                        />
                      </div>
                    )}
                  </td>
                  <td className="py-3 text-gray-500">{row.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Modal>
      )}
    </div>
  );
}
