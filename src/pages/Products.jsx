import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Download, Upload } from "lucide-react";
import {
  fetchAllProducts,
  fetchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../lib/productsApi";
import { inputCls } from "../lib/ui";
import { parseCsvRecords, toCsv, downloadCsv } from "../lib/csv";
import { useAuth } from "../context/AuthContext";
import SearchInput from "../components/SearchInput";
import PaginationBar from "../components/PaginationBar";
import TableStateRow from "../components/TableStateRow";
import Modal from "../components/Modal";
import FormError from "../components/FormError";
import DeleteModalActions from "../components/DeleteModalActions";
import CsvDropzone from "../components/CsvDropzone";

const CSV_COLUMNS = [
  "id",
  "sku",
  "name",
  "category",
  "categoryGroup",
  "brand",
  "maker",
  "country",
  "region",
  "price",
  "offerPrice",
  "membersPrice",
  "clearancePrice",
  "packOf",
  "packPrice",
  "caseOf",
  "casePrice",
  "image",
  "inStock",
  "stockQuantity",
  "volumeMl",
  "abv",
  "vintage",
  "wineBody",
  "sweetness",
  "grapeVariety",
  "closure",
  "flavorNotes",
  "aroma",
  "ingredients",
  "storageInstructions",
  "foodRecommendations",
  "description",
  "verificationEmail",
  "verified",
];

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

async function importProductsCsv(file, existingProducts) {
  const text = await readFileAsText(file);
  const records = parseCsvRecords(text);
  const byId = new Map(existingProducts.map((p) => [p._id, p]));

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const record of records) {
    if (!record.name) {
      skipped++;
      continue;
    }
    const body = {
      sku: record.sku ?? "",
      name: record.name,
      category: record.category ?? "",
      categoryGroup: record.categorygroup || "wine",
      brand: record.brand ?? "",
      maker: record.maker ?? "",
      country: record.country ?? "",
      region: record.region ?? "",
      price: Number(record.price) || 0,
      offerPrice: Number(record.offerprice) || 0,
      membersPrice: Number(record.membersprice) || 0,
      clearancePrice: Number(record.clearanceprice) || 0,
      packOf: Number(record.packof) || 0,
      packPrice: Number(record.packprice) || 0,
      caseOf: Number(record.caseof) || 0,
      casePrice: Number(record.caseprice) || 0,
      image: record.image ?? "",
      inStock: record.instock
        ? ["true", "1", "yes"].includes(record.instock.toLowerCase())
        : true,
      stockQuantity: Number(record.stockquantity) || 0,
      volumeMl: Number(record.volumeml) || 0,
      abv: record.abv ?? "",
      vintage: record.vintage ?? "",
      wineBody: record.winebody ?? "",
      sweetness: record.sweetness ?? "",
      grapeVariety: record.grapevariety ?? "",
      closure: record.closure ?? "",
      flavorNotes: record.flavornotes ?? "",
      aroma: record.aroma ?? "",
      ingredients: record.ingredients ?? "",
      storageInstructions: record.storageinstructions ?? "",
      foodRecommendations: record.foodrecommendations ?? "",
      description: record.description ?? "",
      verificationEmail: record.verificationemail ?? "",
      verified: record.verified
        ? ["true", "1", "yes"].includes(record.verified.toLowerCase())
        : false,
    };

    if (record.id && byId.has(record.id)) {
      await updateProduct(record.id, body);
      updated++;
    } else {
      await createProduct(body);
      created++;
    }
  }

  return { created, updated, skipped };
}

const EMPTY_FORM = {
  sku: "",
  name: "",
  category: "",
  categoryGroup: "wine",
  brand: "",
  maker: "",
  country: "",
  region: "",
  price: "",
  offerPrice: "",
  membersPrice: "",
  clearancePrice: "",
  packOf: "",
  packPrice: "",
  caseOf: "",
  casePrice: "",
  image: "",
  inStock: true,
  stockQuantity: "",
  volumeMl: "",
  abv: "",
  vintage: "",
  wineBody: "",
  sweetness: "",
  grapeVariety: "",
  closure: "",
  flavorNotes: "",
  aroma: "",
  ingredients: "",
  storageInstructions: "",
  foodRecommendations: "",
  description: "",
  verificationEmail: "",
  verified: false,
};

// Field definitions for the Add/Edit Product form, grouped into sections.
// `key` maps to state in `editing`; number fields are stored as strings while editing.
const PRODUCT_FORM_SECTIONS = [
  {
    title: "Basic Information",
    fields: [
      { key: "sku", label: "SKU" },
      { key: "name", label: "Product Name", span: 2, required: true },
      {
        key: "category",
        label: "Category",
        required: true,
        placeholder: "e.g. Red Wine · 750mL",
      },
      {
        key: "categoryGroup",
        label: "Category Group",
        type: "select",
        options: [
          { value: "wine", label: "Wine" },
          { value: "spirits", label: "Spirits" },
          { value: "beer", label: "Beer" },
          { value: "offers", label: "Offers" },
        ],
      },
      { key: "brand", label: "Brand Name" },
      { key: "maker", label: "Maker" },
      { key: "country", label: "Country" },
      { key: "region", label: "Region" },
    ],
  },
  {
    title: "Pricing",
    fields: [
      { key: "price", label: "Original Price", type: "number", required: true },
      { key: "offerPrice", label: "Offer Price", type: "number" },
      { key: "membersPrice", label: "Members Price", type: "number" },
      { key: "clearancePrice", label: "Clearance Price", type: "number" },
    ],
  },
  {
    title: "Bulk Packaging",
    fields: [
      { key: "packOf", label: "Pack Of (units)", type: "number" },
      { key: "packPrice", label: "Pack Price", type: "number" },
      { key: "caseOf", label: "Case Of (units)", type: "number" },
      { key: "casePrice", label: "Case Price", type: "number" },
    ],
  },
  {
    title: "Stock",
    fields: [
      { key: "stockQuantity", label: "Stock Quantity", type: "number" },
      { key: "inStock", label: "In Stock", type: "checkbox" },
    ],
  },
  {
    title: "Product Details",
    fields: [
      { key: "volumeMl", label: "Volume (mL)", type: "number" },
      { key: "abv", label: "Alcohol Volume (ABV)", placeholder: "e.g. 13.5%" },
      { key: "vintage", label: "Vintage" },
      { key: "wineBody", label: "Wine Body" },
      { key: "sweetness", label: "Sweetness" },
      { key: "grapeVariety", label: "Grape Variety" },
      { key: "closure", label: "Closure" },
    ],
  },
  {
    title: "Description",
    fields: [
      { key: "description", label: "Description", type: "textarea", span: 2 },
    ],
  },
  {
    title: "Tasting Notes",
    fields: [
      { key: "flavorNotes", label: "Flavor Notes", type: "textarea", span: 2 },
      { key: "aroma", label: "Aroma", type: "textarea", span: 2 },
      { key: "ingredients", label: "Ingredients", type: "textarea", span: 2 },
    ],
  },
  {
    title: "Care & Serving",
    fields: [
      {
        key: "storageInstructions",
        label: "Storage Instructions",
        type: "textarea",
        span: 2,
      },
      {
        key: "foodRecommendations",
        label: "Food Recommendations",
        type: "textarea",
        span: 2,
      },
    ],
  },
];

const NUMBER_FIELD_KEYS = PRODUCT_FORM_SECTIONS.flatMap((s) => s.fields)
  .filter((f) => f.type === "number")
  .map((f) => f.key);

const PER_PAGE = 20;

export default function Products() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null); // product object, or {} for new
  const [deleting, setDeleting] = useState(null); // product object
  const [importing, setImporting] = useState(false);

  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["products", search, page],
    queryFn: () => fetchProducts({ search, page, perPage: PER_PAGE }),
    placeholderData: (prev) => prev,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["products"] });
  }

  const saveMutation = useMutation({
    mutationFn: (payload) =>
      payload.id
        ? updateProduct(payload.id, payload.body)
        : createProduct(payload.body),
    onSuccess: () => {
      invalidate();
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteProduct(id),
    onSuccess: () => {
      invalidate();
      setDeleting(null);
    },
  });

  const verifyMutation = useMutation({
    mutationFn: ({ id, verified }) =>
      updateProduct(id, {
        verified,
        verificationEmail: verified ? user.email : "",
      }),
    onSuccess: (updated) => {
      invalidate();
      setEditing((cur) =>
        cur && !cur.isNew && cur.id === updated._id
          ? {
              ...cur,
              verified: updated.verified,
              verificationEmail: updated.verificationEmail,
            }
          : cur,
      );
    },
  });

  function toggleVerified(product) {
    verifyMutation.mutate({ id: product._id, verified: !product.verified });
  }

  const importMutation = useMutation({
    mutationFn: async (file) => {
      const existing = await fetchAllProducts();
      return importProductsCsv(file, existing);
    },
    onSuccess: invalidate,
  });

  async function handleExport() {
    const all = await fetchAllProducts();
    const rows = all.map((p) => ({ ...p, id: p._id }));
    downloadCsv("products.csv", toCsv(rows, CSV_COLUMNS));
  }

  function openImport() {
    importMutation.reset();
    setImporting(true);
  }

  function openCreate() {
    saveMutation.reset();
    setEditing({ isNew: true, ...EMPTY_FORM });
  }

  function openEdit(product) {
    saveMutation.reset();
    const form = { ...EMPTY_FORM };
    for (const key of Object.keys(EMPTY_FORM)) {
      if (key === "inStock" || key === "verified") continue;
      const value = product[key];
      form[key] = NUMBER_FIELD_KEYS.includes(key)
        ? String(value ?? "")
        : value || "";
    }
    setEditing({
      ...form,
      isNew: false,
      id: product._id,
      inStock: product.inStock,
      verified: Boolean(product.verified),
    });
  }

  function handleSubmit(e) {
    e.preventDefault();
    const body = {
      categoryGroup: editing.categoryGroup,
      inStock: editing.inStock,
      verified: editing.verified,
    };
    for (const key of Object.keys(EMPTY_FORM)) {
      if (["categoryGroup", "inStock", "verified"].includes(key)) continue;
      body[key] = NUMBER_FIELD_KEYS.includes(key)
        ? Number(editing[key]) || 0
        : editing[key].trim();
    }
    saveMutation.mutate({ id: editing.isNew ? null : editing.id, body });
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Products</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 text-gray-700 text-sm px-4 py-2 hover:bg-gray-50 transition-colors"
          >
            <Download size={14} /> Export CSV
          </button>
          <button
            onClick={openImport}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 text-gray-700 text-sm px-4 py-2 hover:bg-gray-50 transition-colors"
          >
            <Upload size={14} /> Import CSV
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 rounded-lg bg-primary text-white text-sm px-4 py-2 hover:opacity-90 transition-opacity shadow-sm"
          >
            <Plus size={14} /> Add Product
          </button>
        </div>
      </div>

      <div className="mt-4 max-w-sm">
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Search products…"
        />
      </div>

      <div className="mt-4 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/60 text-left text-xs text-gray-500">
              <th className="px-4 py-2.5 font-medium">Name</th>
              <th className="px-4 py-2.5 font-medium">Category</th>
              <th className="px-4 py-2.5 font-medium">Price</th>
              <th className="px-4 py-2.5 font-medium">Stock</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium">Verification</th>
              <th className="px-4 py-2.5 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading && <TableStateRow colSpan={7}>Loading…</TableStateRow>}
            {isError && (
              <TableStateRow colSpan={7}>
                Failed to load products: {error.message}
              </TableStateRow>
            )}
            {!isLoading && !isError && items.length === 0 && (
              <TableStateRow colSpan={7}>No products found.</TableStateRow>
            )}
            {items.map((p) => (
              <tr key={p._id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-2.5 text-gray-900">{p.name}</td>
                <td className="px-4 py-2.5 text-gray-600">{p.category}</td>
                <td className="px-4 py-2.5 text-gray-600">
                  ${p.price.toFixed(2)}
                </td>
                <td className="px-4 py-2.5 text-gray-600">{p.stockQuantity}</td>
                <td className="px-4 py-2.5">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      p.inStock
                        ? "bg-green-50 text-green-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {p.inStock ? "In Stock" : "Out of Stock"}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <label
                    className="flex items-center gap-1.5 text-xs cursor-pointer"
                    title={
                      p.verified
                        ? `Verified by ${p.verificationEmail}`
                        : `Click to verify as ${user.email}`
                    }
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(p.verified)}
                      disabled={verifyMutation.isPending}
                      onChange={() => toggleVerified(p)}
                    />
                    <span
                      className={
                        p.verified ? "text-green-700" : "text-gray-500"
                      }
                    >
                      {p.verified ? "Verified" : "Unverified"}
                    </span>
                  </label>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() => openEdit(p)}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-primary hover:bg-primary/10 transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setDeleting(p)}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <PaginationBar
          page={page}
          totalPages={totalPages}
          total={total}
          perPage={PER_PAGE}
          onPageChange={setPage}
        />
      </div>

      {editing && (
        <Modal
          title={editing.isNew ? "Add Product" : "Edit Product"}
          size="2xl"
          onClose={() => setEditing(null)}
          footer={
            <div className="space-y-2">
              <FormError message={saveMutation.error?.message} />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="text-sm rounded-lg text-gray-600 border border-gray-300 px-4 py-2 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="product-form"
                  disabled={saveMutation.isPending}
                  className="text-sm rounded-lg bg-primary text-white px-4 py-2 hover:opacity-90 disabled:opacity-60 transition-opacity shadow-sm"
                >
                  {saveMutation.isPending ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          }
        >
          <form id="product-form" onSubmit={handleSubmit} className="space-y-3">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                Verification
              </h4>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5">
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editing.verified}
                    disabled={!editing.isNew && verifyMutation.isPending}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      if (editing.isNew) {
                        setEditing({
                          ...editing,
                          verified: checked,
                          verificationEmail: checked ? user.email : "",
                        });
                      } else {
                        verifyMutation.mutate({
                          id: editing.id,
                          verified: checked,
                        });
                      }
                    }}
                  />
                  <span className="font-medium">Verified</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      editing.verified
                        ? "bg-green-50 text-green-700"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {editing.verified ? "Verified" : "Unverified"}
                  </span>
                </label>
                <p className="mt-1 pl-6 text-xs text-gray-500">
                  {editing.verified
                    ? `Verified by ${editing.verificationEmail}`
                    : `Will be recorded as verified by ${user.email}`}
                </p>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                Image
              </h4>
              <label className="block text-xs text-gray-500 space-y-0.5">
                <span>Image URL</span>
                <input
                  placeholder="https://…"
                  className={inputCls}
                  value={editing.image}
                  onChange={(e) =>
                    setEditing({ ...editing, image: e.target.value })
                  }
                />
              </label>
            </div>

            {PRODUCT_FORM_SECTIONS.map((section) => (
              <div key={section.title}>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                  {section.title}
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {section.fields.map((field) => (
                    <label
                      key={field.key}
                      className={`text-xs text-gray-500 space-y-0.5 ${
                        field.span === 2 ? "col-span-2" : ""
                      } ${field.type === "checkbox" ? "flex items-center gap-2 text-sm text-gray-700 pt-3.5" : ""}`}
                    >
                      {field.type === "checkbox" ? (
                        <>
                          <input
                            type="checkbox"
                            checked={editing[field.key]}
                            onChange={(e) =>
                              setEditing({
                                ...editing,
                                [field.key]: e.target.checked,
                              })
                            }
                          />
                          {field.label}
                        </>
                      ) : (
                        <>
                          <span>
                            {field.label}
                            {field.required && (
                              <span className="text-primary"> *</span>
                            )}
                          </span>
                          {field.type === "select" ? (
                            <select
                              className={inputCls}
                              value={editing[field.key]}
                              onChange={(e) =>
                                setEditing({
                                  ...editing,
                                  [field.key]: e.target.value,
                                })
                              }
                            >
                              {field.options.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          ) : field.type === "textarea" ? (
                            <textarea
                              rows={3}
                              placeholder={field.placeholder}
                              className={inputCls}
                              value={editing[field.key]}
                              onChange={(e) =>
                                setEditing({
                                  ...editing,
                                  [field.key]: e.target.value,
                                })
                              }
                            />
                          ) : (
                            <input
                              required={field.required}
                              type={field.type === "number" ? "number" : "text"}
                              step={
                                field.type === "number" ? "0.01" : undefined
                              }
                              min={field.type === "number" ? "0" : undefined}
                              placeholder={field.placeholder}
                              className={inputCls}
                              value={editing[field.key]}
                              onChange={(e) =>
                                setEditing({
                                  ...editing,
                                  [field.key]: e.target.value,
                                })
                              }
                            />
                          )}
                        </>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </form>
        </Modal>
      )}

      {deleting && (
        <Modal title="Delete Product" onClose={() => setDeleting(null)}>
          <p className="text-sm text-gray-600">
            Are you sure you want to delete <strong>{deleting.name}</strong>?
            This cannot be undone.
          </p>
          <DeleteModalActions
            formErr={deleteMutation.error?.message}
            isPending={deleteMutation.isPending}
            onCancel={() => setDeleting(null)}
            onDelete={() => deleteMutation.mutate(deleting._id)}
          />
        </Modal>
      )}

      {importing && (
        <Modal title="Import Products CSV" onClose={() => setImporting(false)}>
          <p className="text-sm text-gray-500 mb-3">
            Columns: id (optional, updates existing product), then any of:{" "}
            {CSV_COLUMNS.filter((c) => c !== "id").join(", ")}.
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
              Created {importMutation.data.created}, updated{" "}
              {importMutation.data.updated}
              {importMutation.data.skipped > 0
                ? `, skipped ${importMutation.data.skipped} row(s) without a name`
                : ""}
              .
            </p>
          )}
          <div className="flex justify-end pt-4">
            <button
              type="button"
              onClick={() => setImporting(false)}
              className="text-sm rounded-lg text-gray-600 border border-gray-300 px-4 py-2 hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
