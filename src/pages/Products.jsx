import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Country, State } from "country-state-city";
import {
  Plus,
  Upload,
  Pencil,
  Trash2,
  ImagePlus,
  Download,
  Package,
  BarChart2,
  ShieldCheck,
  Database,
} from "lucide-react";
import { api, BASE, getToken } from "../lib/api";
import { inputCls } from "../lib/ui";
import Modal from "../components/Modal";
import { validateImage, PRODUCT_IMAGE } from "../lib/imageValidation";
import PaginationBar from "../components/PaginationBar";
import DeleteModalActions from "../components/DeleteModalActions";
import ImageUploadTrigger from "../components/ImageUploadTrigger";
import SearchInput from "../components/SearchInput";
import TableStateRow from "../components/TableStateRow";
import FormError from "../components/FormError";
import CsvDropzone from "../components/CsvDropzone";
import { useProductsPage } from "../hooks/useProductsPage";
import { parseCsvHeaders } from "../lib/csv";

const EMPTY_NUTRITIONAL = { servingSize: "", rows: [] };

const EMPTY_FORM = {
  sku: "",
  name: "",
  categoryIds: [],
  imageUrl: "",
  originalPrice: "",
  isNew: false,
  stock: "0",
  description: "",
  alcoholVolume: "",
  volumeMl: "",
  maker: "",
  brandName: "",
  country: "",
  region: "",
  sweetness: "",
  flavorNotes: "",
  grapeVariety: "",
  ingredients: "",
  wineBody: "",
  aroma: "",
  vintage: "",
  closure: "",
  packOf: "",
  packPrice: "",
  caseOf: "",
  casePrice: "",
  promotionType: "NONE",
  promotionPrice: "",
  promotionPackPrice: "",
  promotionCasePrice: "",
  servingSuggestions: "",
  allergens: "",
  awards: "",
  storageInstructions: "",
  foodRecommendations: "",
  nutritionalInfo: EMPTY_NUTRITIONAL,
  isVerified: false,
};

// ── POS data import ─────────────────────────────────────────────────────────
// POS exports use arbitrary column names, so the admin maps each target field
// to a column from their file before importing. The export has one row per
// quantity tier (a SKU repeats with different tierQty/tierPrice values, e.g.
// 1/4/24), so rows are grouped by sku before being applied to a product.

const POS_FIELDS = [
  { key: "sku", label: "SKU", required: true },
  { key: "caseQty", label: "Case Quantity → Case Of" },
  { key: "casesOnHand", label: "Cases on hand" },
  { key: "itemsOnHand", label: "Items on hand" },
  { key: "tierQty", label: "Quantity (per pricing tier)" },
  { key: "tierPrice", label: "Price (for that quantity)" },
];

function normalizeHeader(h) {
  return h
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Best-effort guess at which CSV column matches each POS field, for the admin to review/correct. */
function guessPosColumnMap(headers) {
  const used = new Set();
  const norm = headers.map((h) => ({ raw: h, n: normalizeHeader(h) }));

  function take(...patterns) {
    const match = norm.find(
      (h) => !used.has(h.raw) && patterns.some((p) => p.test(h.n)),
    );
    if (match) used.add(match.raw);
    return match?.raw;
  }

  return {
    sku: take(
      /^id$/,
      /\bsku\b/,
      /\bitem\s*code\b/,
      /\bproduct\s*code\b/,
      /\bcode\b/,
    ),
    caseQty: take(/\bcase\b.*\b(quantity|qty|size|of)\b/),
    casesOnHand: take(/\bcases?\b.*\bon\s*hand\b/),
    itemsOnHand: take(/\bitems?\b.*\bon\s*hand\b/, /\bunits?\b.*\bon\s*hand\b/),
    tierQty: take(/^quantity$/, /^qty$/),
    tierPrice: take(
      /^price$/,
      /\bunit\b.*\bprice\b/,
      /\bsell(ing)?\b.*\bprice\b/,
      /\bretail\b.*\bprice\b/,
    ),
  };
}

const PER_PAGE = 20;

/**
 * Recursively find a node by id in a CatNode tree.
 * Returns { node, path } where path is "Root > Sub > Type".
 */
function downloadTemplate() {
  const csv = [
    "sku,name,categories,volumeMl,imageUrl,originalPrice,promotionType,promotionPrice,isNew,stock,description,alcoholVolume,brandName,maker,country,region,closure,flavorNotes,aroma,ingredients,sweetness,grapeVariety,wineBody,vintage,servingSuggestions,allergens,awards,storageInstructions,foodRecommendations,packOf,packPrice,caseOf,casePrice,promotionPackPrice,promotionCasePrice",
    "10000001,Barossa Valley Estate Shiraz,Wine/Red Wine,750,,29.99,IN_STORE_PROMOTION,24.99,false,50,A rich full-bodied red.,14.5,Penfolds,Penfolds,Australia,Barossa Valley,screw-cap,Dark cherry and vanilla,Plum and oak,,dry,Shiraz,full,,,,,,,,,,,,",
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "products_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function downloadPosTemplate() {
  const csv = [
    "ID,Case Quantity,Cases on hand,Items on hand,Quantity,Price",
    "10000001,24,0,20,1,9",
    "10000001,24,0,20,4,27",
    "10000001,24,0,20,24,130",
    "10000002,6,0,3,1,69.99",
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "pos_data_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

/** Builds a CSV from failed-row objects (each carrying an `_error` field) and downloads it. */
function downloadFailedRows(rows, filename) {
  if (rows.length === 0) return;
  const otherKeys = [
    ...new Set(
      rows.flatMap((r) => Object.keys(r).filter((k) => k !== "_error")),
    ),
  ];
  const headers = ["_error", ...otherKeys];
  const escape = (v) =>
    v.includes(",") || v.includes('"') || v.includes("\n")
      ? `"${v.replace(/"/g, '""')}"`
      : v;
  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((h) => escape(row[h] ?? "")).join(",")),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function downloadFailedCsv(jobId) {
  const token = getToken();
  const res = await fetch(
    `${BASE}/api/v1/admin/products/import-job/${jobId}/failed-csv`,
    { headers: token ? { Authorization: `Bearer ${token}` } : {} },
  );
  if (!res.ok) return;
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `import_failed_${jobId.slice(0, 8)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

async function exportProductsCsv() {
  const token = getToken();
  const res = await fetch(`${BASE}/api/v1/admin/products/export`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) return;
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `products_export_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function findNodeById(id, nodes, ancestorPath = "") {
  for (const node of nodes) {
    const currentPath = ancestorPath
      ? `${ancestorPath} > ${node.name}`
      : node.name;
    if (node.id === id) return { node, path: currentPath };
    const found = findNodeById(id, node.children ?? [], currentPath);
    if (found) return found;
  }
  return null;
}

function DropdownRow({
  label,
  value,
  options,
  onChange,
  addLevel,
  selectCls,
  inlineAdd,
  setInlineAdd,
  inlineAddName,
  setInlineAddName,
  onSave,
  isSaving,
  selectId,
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label htmlFor={selectId} className="text-xs font-medium text-gray-600">
          {label}
        </label>
        <button
          type="button"
          onClick={() => {
            setInlineAdd(addLevel);
            setInlineAddName("");
          }}
          className="text-xs text-primary flex items-center gap-0.5"
        >
          <span className="text-base leading-none">+</span> New
        </button>
      </div>
      <select
        id={selectId}
        className={selectCls}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">— Select —</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
      {inlineAdd === addLevel && (
        <div className="flex gap-1 mt-1">
          <input
            autoFocus
            value={inlineAddName}
            onChange={(e) => setInlineAddName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSave(addLevel);
              if (e.key === "Escape") setInlineAdd(null);
            }}
            placeholder={`New ${label.toLowerCase()} name…`}
            className="flex-1 border border-primary/40 px-2 py-1 text-sm outline-none"
          />
          <button
            type="button"
            onClick={() => onSave(addLevel)}
            disabled={isSaving || !inlineAddName.trim()}
            className="text-xs bg-primary text-white px-2.5 py-1 disabled:opacity-60"
          >
            {isSaving ? "…" : "Add"}
          </button>
          <button
            type="button"
            onClick={() => setInlineAdd(null)}
            className="text-xs text-gray-400 hover:text-gray-600 px-1"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

// ── Compare modal (per-product competitor price overview) ─────────────────────

function CompareModal({ productId, productName, ourPrice, onClose }) {
  const { data: links = [], isLoading } = useQuery({
    queryKey: ["product-links", productId],
    queryFn: () => api.get(`/competitors/products/${productId}/links`),
  });

  return (
    <Modal title={`Compare: ${productName}`} onClose={onClose}>
      <div className="space-y-3">
        <p className="text-sm text-gray-500">
          Our price:{" "}
          <span className="font-semibold text-gray-900">
            ${ourPrice.toFixed(2)}
          </span>
        </p>
        {isLoading && (
          <p className="text-sm text-gray-400 py-4 text-center">Loading…</p>
        )}
        {!isLoading && links.length === 0 && (
          <p className="text-sm text-gray-400 py-4 text-center">
            No competitor links configured for this product.
            <br />
            <span className="text-xs">Add them in the Compare page.</span>
          </p>
        )}
        {links.map((link) => {
          const delta =
            link.lastKnownPrice != null ? ourPrice - link.lastKnownPrice : null;
          return (
            <div
              key={link.id}
              className="flex items-start justify-between gap-3 p-3 border border-gray-100 bg-gray-50/50"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800">
                  {link.competitor.name}
                </p>
                {link.lastKnownName && (
                  <p className="text-xs text-gray-400 truncate">
                    {link.lastKnownName}
                  </p>
                )}
                {link.url && (
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-blue-500 hover:underline truncate block"
                  >
                    {link.url}
                  </a>
                )}
                {link.lastFetchedAt && (
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Fetched{" "}
                    {new Date(link.lastFetchedAt).toLocaleDateString("en-AU")}
                  </p>
                )}
              </div>
              <div className="text-right shrink-0">
                {link.lastKnownPrice != null ? (
                  <>
                    <p className="text-sm font-bold text-gray-900">
                      ${link.lastKnownPrice.toFixed(2)}
                    </p>
                    {delta !== null && delta !== 0 && (
                      <p
                        className={`text-xs font-medium ${delta < 0 ? "text-green-600" : "text-red-600"}`}
                      >
                        {delta < 0 ? "We're cheaper" : "They're cheaper"} by $
                        {Math.abs(delta).toFixed(2)}
                      </p>
                    )}
                    {delta === 0 && (
                      <p className="text-xs text-gray-400">Same price</p>
                    )}
                  </>
                ) : link.url ? (
                  <p className="text-xs text-gray-400 italic">
                    URL set, not fetched
                  </p>
                ) : (
                  <p className="text-xs text-gray-300">No link</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

export default function Products() {
  const queryClient = useQueryClient();

  const [compareProduct, setCompareProduct] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const [modal, setModal] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErr, setFormErr] = useState("");

  const [uploadingImg, setUploadingImg] = useState(false);
  const imageRef = useRef(null);

  const [importResult, setImportResult] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importJobId, setImportJobId] = useState(null);
  const [lastImportJobId, setLastImportJobId] = useState(null);
  const [importProgress, setImportProgress] = useState(null);

  useEffect(() => {
    if (!importJobId) return;
    const interval = setInterval(async () => {
      try {
        const job = await api.get(
          `/admin/products/import-job/${importJobId}`,
        );
        setImportProgress({
          processed: job.processed,
          total: job.total,
          created: job.created,
          updated: job.updated,
        });
        if (job.status !== "processing") {
          clearInterval(interval);
          setLastImportJobId(importJobId);
          setImportJobId(null);
          setImporting(false);
          setImportResult({
            created: job.created,
            updated: job.updated,
            errors: job.errors,
          });
          queryClient.invalidateQueries({ queryKey: ["products"] });
        }
      } catch {
        /* keep polling */
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [importJobId, queryClient]);

  const [exporting, setExporting] = useState(false);

  const [posFile, setPosFile] = useState(null);
  const [posHeaders, setPosHeaders] = useState([]);
  const [posMap, setPosMap] = useState({});
  const [posFullSync, setPosFullSync] = useState(true);
  const [posImporting, setPosImporting] = useState(false);
  const [posResult, setPosResult] = useState(null);
  const [posErr, setPosErr] = useState("");

  const [selected, setSelected] = useState(new Set());

  const [inlineAdd, setInlineAdd] = useState(null);
  const [inlineAddName, setInlineAddName] = useState("");

  // Picker state for the cascading add-category UI
  const [pickerCat, setPickerCat] = useState("");
  const [pickerSub, setPickerSub] = useState("");
  const [pickerType, setPickerType] = useState("");

  // Category filter state (separate from the form picker above)
  const [filterCat, setFilterCat] = useState("");
  const [filterSub, setFilterSub] = useState("");
  const [filterType, setFilterType] = useState("");
  const activeCategoryId = filterType || filterSub || filterCat || undefined;

  // null = all, true = verified only, false = unverified only
  const [filterVerified, setFilterVerified] = useState(null);

  const { data, isLoading, error } = useProductsPage(
    "products",
    page,
    search,
    PER_PAGE,
    activeCategoryId,
    filterVerified,
  );

  const products = data?.products ?? [];
  const total = data?.total ?? 0;

  const { data: catTree = [] } = useQuery({
    queryKey: ["catalogue"],
    queryFn: () => api.get("/admin/catalogue"),
  });

  const saveMutation = useMutation({
    mutationFn: ({ isAdd, id, body }) =>
      isAdd ? api.post("/products", body) : api.put(`/products/${id}`, body),
    onSuccess: async () => {
      await queryClient.refetchQueries({
        queryKey: ["products"],
        type: "active",
      });
      setModal(null);
      setPage(1);
    },
    onError: (err) => setFormErr(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/products/${id}`),
    onSuccess: async () => {
      await queryClient.refetchQueries({
        queryKey: ["products"],
        type: "active",
      });
      setModal(null);
    },
    onError: (err) => setFormErr(err.message),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids) =>
      Promise.all(ids.map((id) => api.delete(`/products/${id}`))),
    onSuccess: async () => {
      await queryClient.refetchQueries({
        queryKey: ["products"],
        type: "active",
      });
      setSelected(new Set());
    },
    onError: (err) => setFormErr(err.message),
  });

  const deleteAllMutation = useMutation({
    mutationFn: () => api.delete("/admin/products"),
    onSuccess: async () => {
      await queryClient.refetchQueries({
        queryKey: ["products"],
        type: "active",
      });
      setModal(null);
      setSelected(new Set());
      setPage(1);
    },
    onError: (err) => setFormErr(err.message),
  });

  const inlineAddMutation = useMutation({
    mutationFn: ({ name, parentId }) =>
      api.post("/admin/catalogue", {
        name,
        parentId,
      }),
    onSuccess: async (created) => {
      await queryClient.refetchQueries({ queryKey: ["catalogue"] });
      // Add the newly created node's id to categoryIds
      setForm((prev) => ({
        ...prev,
        categoryIds: prev.categoryIds.includes(created.id)
          ? prev.categoryIds
          : [...prev.categoryIds, created.id],
      }));
      setInlineAdd(null);
      setInlineAddName("");
    },
  });

  function toggleSelect(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) =>
      prev.size === products.length
        ? new Set()
        : new Set(products.map((p) => p.id)),
    );
  }

  function deleteSelected() {
    if (selected.size === 0) return;
    if (
      globalThis.confirm(
        `Delete ${selected.size} product${selected.size !== 1 ? "s" : ""}? This cannot be undone.`,
      )
    ) {
      bulkDeleteMutation.mutate([...selected]);
    }
  }

  function openAdd() {
    setForm(EMPTY_FORM);
    setFormErr("");
    setInlineAdd(null);
    setPickerCat("");
    setPickerSub("");
    setPickerType("");
    setModal("add");
  }

  function openEdit(p) {
    setEditing(p);
    const ni = p.nutritionalInfo;
    setForm({
      sku: p.sku,
      name: p.name,
      categoryIds: p.categories.map((c) => c.id),
      imageUrl: p.imageUrl,
      originalPrice: String(p.originalPrice),
      isNew: p.isNew,
      stock: String(p.stock),
      description: p.description ?? "",
      alcoholVolume: p.alcoholVolume != null ? String(p.alcoholVolume) : "",
      volumeMl: p.volumeMl != null ? String(p.volumeMl) : "",
      maker: p.maker ?? "",
      brandName: p.brandName ?? "",
      country: p.country ?? "",
      region: p.region ?? "",
      sweetness: p.sweetness ?? "",
      flavorNotes: p.flavorNotes ?? "",
      grapeVariety: p.grapeVariety ?? "",
      ingredients: p.ingredients ?? "",
      wineBody: p.wineBody ?? "",
      aroma: p.aroma ?? "",
      vintage: p.vintage == null ? "" : String(p.vintage),
      closure: p.closure ?? "",
      packOf: p.packOf == null ? "" : String(p.packOf),
      packPrice: p.packPrice == null ? "" : String(p.packPrice),
      caseOf: p.caseOf == null ? "" : String(p.caseOf),
      casePrice: p.casePrice == null ? "" : String(p.casePrice),
      promotionType: p.promotionType,
      promotionPrice: p.promotionPrice == null ? "" : String(p.promotionPrice),
      promotionPackPrice:
        p.promotionPackPrice == null ? "" : String(p.promotionPackPrice),
      promotionCasePrice:
        p.promotionCasePrice == null ? "" : String(p.promotionCasePrice),
      servingSuggestions: p.servingSuggestions ?? "",
      allergens: p.allergens ?? "",
      awards: p.awards ?? "",
      storageInstructions: p.storageInstructions ?? "",
      foodRecommendations: p.foodRecommendations ?? "",
      nutritionalInfo: ni ?? EMPTY_NUTRITIONAL,
      isVerified: p.isVerified,
    });
    setFormErr("");
    setInlineAdd(null);
    setPickerCat("");
    setPickerSub("");
    setPickerType("");
    setModal("edit");
  }

  function saveInlineAdd(level) {
    if (!inlineAddName.trim()) return;
    const selectedCatNode = catTree.find((c) => c.id === pickerCat);
    const selectedSubNode = selectedCatNode?.children.find(
      (c) => c.id === pickerSub,
    );
    const parentId =
      level === "cat"
        ? null
        : level === "sub"
          ? (selectedCatNode?.id ?? null)
          : (selectedSubNode?.id ?? null);
    inlineAddMutation.mutate({ name: inlineAddName.trim(), parentId, level });
  }

  function openDelete(p) {
    setEditing(p);
    setFormErr("");
    setModal("delete");
  }

  function f(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // Admin list/compare views have no logged-in-shopper context, so MEMBER
  // promotions display as the original price here (member-only discount).
  function effectivePrice(p) {
    if (p.promotionType === "NONE" || p.promotionType === "MEMBER")
      return p.originalPrice;
    return p.promotionPrice ?? p.originalPrice;
  }

  async function uploadImage(file) {
    const err = await validateImage(file, PRODUCT_IMAGE);
    if (err) {
      setFormErr(err);
      return;
    }

    const fd = new FormData();
    fd.append("image", file);
    setUploadingImg(true);
    try {
      const res = await api.upload(
        "/admin/upload/image?type=product",
        fd,
      );
      f("imageUrl", res.url);
    } catch (e) {
      setFormErr(e instanceof Error ? e.message : "Image upload failed");
    } finally {
      setUploadingImg(false);
    }
  }

  /** Resolves the most-specific picker selection to a category ID and adds it. */
  function addPickerCategory() {
    const resolvedId = pickerType || pickerSub || pickerCat;
    if (!resolvedId) return;
    if (form.categoryIds.includes(resolvedId)) return;
    setForm((prev) => ({
      ...prev,
      categoryIds: [...prev.categoryIds, resolvedId],
    }));
    setPickerCat("");
    setPickerSub("");
    setPickerType("");
  }

  function removeCategoryId(id) {
    setForm((prev) => ({
      ...prev,
      categoryIds: prev.categoryIds.filter((c) => c !== id),
    }));
  }

  function save() {
    setFormErr("");
    if (form.categoryIds.length === 0) {
      setFormErr("Please select at least one category");
      return;
    }
    if (
      form.promotionType !== "NONE" &&
      form.promotionPrice === "" &&
      form.promotionPackPrice === "" &&
      form.promotionCasePrice === ""
    ) {
      setFormErr(
        "Enter at least one promotion price (unit, pack, or case) — a promotion with no price won't show a discount on the storefront.",
      );
      return;
    }
    const hasNutritional =
      form.nutritionalInfo.rows.length > 0 ||
      form.nutritionalInfo.servingSize.trim() !== "";
    const body = {
      sku: form.sku.trim(),
      name: form.name,
      categoryIds: form.categoryIds,
      imageUrl: form.imageUrl,
      originalPrice: Number.parseFloat(form.originalPrice),
      isNew: form.isNew,
      stock: Number.parseInt(form.stock) || 0,
      description: form.description || null,
      alcoholVolume:
        form.alcoholVolume === ""
          ? null
          : Number.parseFloat(form.alcoholVolume),
      volumeMl: form.volumeMl === "" ? null : Number.parseFloat(form.volumeMl),
      maker: form.maker || null,
      brandName: form.brandName || null,
      country: form.country || null,
      region: form.region || null,
      sweetness: form.sweetness || null,
      flavorNotes: form.flavorNotes || null,
      grapeVariety: form.grapeVariety || null,
      ingredients: form.ingredients || null,
      wineBody: form.wineBody || null,
      aroma: form.aroma || null,
      vintage: form.vintage === "" ? null : Number.parseInt(form.vintage),
      closure: form.closure || null,
      packOf: form.packOf === "" ? null : Number.parseInt(form.packOf),
      packPrice:
        form.packPrice === "" ? null : Number.parseFloat(form.packPrice),
      caseOf: form.caseOf === "" ? null : Number.parseInt(form.caseOf),
      casePrice:
        form.casePrice === "" ? null : Number.parseFloat(form.casePrice),
      promotionType: form.promotionType,
      promotionPrice:
        form.promotionType === "NONE" || form.promotionPrice === ""
          ? null
          : Number.parseFloat(form.promotionPrice),
      promotionPackPrice:
        form.promotionType === "NONE" || form.promotionPackPrice === ""
          ? null
          : Number.parseFloat(form.promotionPackPrice),
      promotionCasePrice:
        form.promotionType === "NONE" || form.promotionCasePrice === ""
          ? null
          : Number.parseFloat(form.promotionCasePrice),
      servingSuggestions: form.servingSuggestions || null,
      allergens: form.allergens || null,
      awards: form.awards || null,
      storageInstructions: form.storageInstructions || null,
      foodRecommendations: form.foodRecommendations || null,
      nutritionalInfo: hasNutritional ? form.nutritionalInfo : null,
      isVerified: form.isVerified,
    };
    saveMutation.mutate({ isAdd: modal === "add", id: editing?.id, body });
  }

  async function importCsv(file) {
    const fd = new FormData();
    fd.append("file", file);
    setImporting(true);
    setImportResult(null);
    setImportProgress(null);
    setLastImportJobId(null);
    try {
      const res = await api.upload("/admin/products/csv", fd);
      setImportProgress({
        processed: 0,
        total: res.total,
        created: 0,
        updated: 0,
      });
      setImportJobId(res.jobId);
      // polling starts via useEffect
    } catch (e) {
      setImportResult({
        created: 0,
        updated: 0,
        errors: [e instanceof Error ? e.message : "Import failed"],
      });
      setImporting(false);
    }
  }

  async function handleExportCsv() {
    setExporting(true);
    try {
      await exportProductsCsv();
    } finally {
      setExporting(false);
    }
  }

  function openPosModal() {
    setPosFile(null);
    setPosHeaders([]);
    setPosMap({});
    setPosFullSync(true);
    setPosResult(null);
    setPosErr("");
    setModal("pos");
  }

  async function handlePosFileSelect(file) {
    const text = await file.text();
    const headers = parseCsvHeaders(text);
    if (headers.length === 0) {
      setPosErr("Could not read any columns from this file");
      return;
    }
    setPosErr("");
    setPosFile(file);
    setPosHeaders(headers);
    setPosMap(guessPosColumnMap(headers));
    setPosResult(null);
  }

  async function submitPosImport() {
    if (!posFile || !posMap.sku) return;
    setPosErr("");
    setPosImporting(true);
    try {
      const fd = new FormData();
      fd.append("file", posFile);
      fd.append("columnMap", JSON.stringify(posMap));
      fd.append("fullSync", String(posFullSync));
      const result = await api.upload("/admin/products/pos-csv", fd);
      setPosResult(result);
      queryClient.invalidateQueries({ queryKey: ["products"] });
    } catch (e) {
      setPosErr(e instanceof Error ? e.message : "Import failed");
    } finally {
      setPosImporting(false);
    }
  }

  const totalPages = Math.ceil(total / PER_PAGE);
  const isSaving =
    saveMutation.isPending ||
    deleteMutation.isPending ||
    bulkDeleteMutation.isPending ||
    deleteAllMutation.isPending;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h2 className="text-xl font-semibold text-gray-900">Products</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => void handleExportCsv()}
            disabled={exporting}
            className="flex items-center gap-1.5 text-xs text-gray-600 border border-gray-300 px-3 py-2 hover:bg-gray-50 disabled:opacity-60"
          >
            {exporting ? null : <Download size={13} />}
            {exporting ? "Exporting…" : "Export CSV"}
          </button>
          <button
            onClick={() => {
              setImportResult(null);
              setModal("import");
            }}
            className="flex items-center gap-1.5 text-xs text-gray-600 border border-gray-300 px-3 py-2 hover:bg-gray-50"
          >
            <Upload size={13} /> Import CSV
          </button>
          <button
            onClick={openPosModal}
            className="flex items-center gap-1.5 text-xs text-gray-600 border border-gray-300 px-3 py-2 hover:bg-gray-50"
          >
            <Database size={13} /> Upload POS Data
          </button>
          <button
            onClick={() => {
              setFormErr("");
              setModal("deleteAll");
            }}
            className="flex items-center gap-1.5 text-xs text-red-600 border border-red-600 px-3 py-2 hover:bg-red-50"
          >
            <Trash2 size={13} /> Delete All
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 text-xs bg-primary text-white px-3 py-2"
          >
            <Plus size={13} /> Add Product
          </button>
        </div>
      </div>

      {/* Search + bulk actions */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <SearchInput
          className="max-w-xs flex-1"
          placeholder="Search products…"
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
        />
        {selected.size > 0 && (
          <button
            onClick={deleteSelected}
            disabled={isSaving}
            className="flex items-center gap-1.5 text-xs border border-red-600 text-red-600 px-3 py-2 hover:bg-red-50 disabled:opacity-60"
          >
            <Trash2 size={13} /> Delete {selected.size} selected
          </button>
        )}
      </div>

      {/* Category filters */}
      {catTree.length > 0 && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <select
            value={filterCat}
            onChange={(e) => {
              setFilterCat(e.target.value);
              setFilterSub("");
              setFilterType("");
              setPage(1);
            }}
            className="border border-gray-200 px-3 py-2 text-sm bg-white outline-none focus:border-primary"
          >
            <option value="">All categories</option>
            {catTree.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {filterCat &&
            (() => {
              const subs =
                catTree.find((c) => c.id === filterCat)?.children ?? [];
              if (subs.length === 0) return null;
              return (
                <select
                  value={filterSub}
                  onChange={(e) => {
                    setFilterSub(e.target.value);
                    setFilterType("");
                    setPage(1);
                  }}
                  className="border border-gray-200 px-3 py-2 text-sm bg-white outline-none focus:border-primary"
                >
                  <option value="">All subcategories</option>
                  {subs.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              );
            })()}
          {filterSub &&
            (() => {
              const types =
                catTree
                  .find((c) => c.id === filterCat)
                  ?.children.find((s) => s.id === filterSub)?.children ?? [];
              if (types.length === 0) return null;
              return (
                <select
                  value={filterType}
                  onChange={(e) => {
                    setFilterType(e.target.value);
                    setPage(1);
                  }}
                  className="border border-gray-200 px-3 py-2 text-sm bg-white outline-none focus:border-primary"
                >
                  <option value="">All types</option>
                  {types.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              );
            })()}
          {(filterCat || filterSub || filterType) && (
            <button
              onClick={() => {
                setFilterCat("");
                setFilterSub("");
                setFilterType("");
                setPage(1);
              }}
              className="text-xs text-gray-400 hover:text-gray-700 border border-gray-300 px-2.5 py-2"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Verified filter */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {[
          [null, "All"],
          [true, "Verified"],
          [false, "Unverified"],
        ].map(([val, label]) => (
          <button
            key={String(val)}
            onClick={() => {
              setFilterVerified(val);
              setPage(1);
            }}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 border ${
              filterVerified === val
                ? "bg-primary text-white border-primary"
                : "text-gray-500 border-gray-300 hover:bg-gray-50"
            }`}
          >
            {val === true && <ShieldCheck size={12} />}
            {label}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-500 mb-4">{error.message}</p>}

      {/* Table */}
      <div className="bg-white border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 w-8">
                  <input
                    type="checkbox"
                    className="accent-primary"
                    checked={
                      products.length > 0 && selected.size === products.length
                    }
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 w-16">
                  Image
                </th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">
                  Name / SKU
                </th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">
                  Category
                </th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">
                  Price
                </th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">
                  Stock
                </th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 w-24">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(() => {
                if (isLoading) {
                  return <TableStateRow colSpan={7}>Loading…</TableStateRow>;
                }
                if (products.length === 0) {
                  return (
                    <TableStateRow colSpan={7}>No products found</TableStateRow>
                  );
                }
                return products.map((p) => {
                  const primaryPath =
                    findNodeById(p.categories[0]?.id ?? "", catTree)?.path ??
                    "—";
                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-gray-50/60 ${selected.has(p.id) ? "bg-primary/5" : ""}`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          className="accent-primary"
                          checked={selected.has(p.id)}
                          onChange={() => toggleSelect(p.id)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        {p.imageUrl ? (
                          <a href={p.imageUrl} target="_blank" rel="noreferrer">
                            <img
                              src={p.imageUrl}
                              alt={p.name}
                              className="w-10 h-10 object-cover hover:opacity-80"
                            />
                          </a>
                        ) : (
                          <div className="w-10 h-10 bg-gray-100 flex items-center justify-center">
                            <Package size={16} className="text-gray-300" />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 truncate max-w-50 flex items-center gap-1.5">
                          {p.name}
                          {p.isVerified && (
                            <span title="Verified">
                              <ShieldCheck
                                size={13}
                                className="text-green-500 shrink-0"
                              />
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-400 font-mono">
                          {p.sku}
                        </p>
                        {(p.brandName || p.volumeMl) && (
                          <p className="text-xs text-gray-400">
                            {[
                              p.brandName,
                              p.volumeMl ? `${p.volumeMl}mL` : null,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-gray-700 truncate max-w-40">
                          {primaryPath}
                        </p>
                        {p.categories.length > 1 && (
                          <p className="text-xs text-gray-400">
                            +{p.categories.length - 1} more
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">
                          $ {effectivePrice(p).toFixed(2)}
                        </p>
                        {effectivePrice(p) !== p.originalPrice && (
                          <p className="text-xs text-gray-400 line-through">
                            $ {p.originalPrice.toFixed(2)}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="border border-gray-400 text-gray-800 px-2 py-0.5 text-xs uppercase tracking-wide">
                          {p.stock}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() =>
                              setCompareProduct({
                                id: p.id,
                                name: p.name,
                                ourPrice: effectivePrice(p),
                              })
                            }
                            className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50"
                            title="Compare prices"
                          >
                            <BarChart2 size={14} />
                          </button>
                          <button
                            onClick={() => openEdit(p)}
                            className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/5"
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => openDelete(p)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
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

      {/* Add / Edit Modal */}
      {(modal === "add" || modal === "edit") && (
        <Modal
          title={modal === "add" ? "Add Product" : "Edit Product"}
          onClose={() => setModal(null)}
        >
          <div className="space-y-3">
            <FormError message={formErr} />

            <div className="border border-gray-100 p-3 bg-gray-50/40 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isVerified"
                  checked={form.isVerified}
                  onChange={(e) => f("isVerified", e.target.checked)}
                  className="w-4 h-4 accent-primary"
                />
                <label
                  htmlFor="isVerified"
                  className="flex items-center gap-1.5 text-sm font-medium text-gray-700"
                >
                  <ShieldCheck size={14} className="text-green-600" />
                  Verified
                  <span className="text-xs font-normal text-gray-400">
                    — only verified products are shown in the store
                  </span>
                </label>
              </div>
              {editing?.verifiedAt && (
                <div className="text-xs text-gray-400 space-y-0.5 pt-1 border-t border-gray-100">
                  <p>
                    Verified by{" "}
                    <span className="font-medium text-gray-600">
                      {editing.verifiedByEmail}
                    </span>
                  </p>
                  <p>
                    {new Date(editing.verifiedAt).toLocaleString("en-AU", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
              )}
            </div>

            {/* Image */}
            <div>
              <label
                htmlFor="prodImageUrl"
                className="block text-xs font-medium text-gray-600 mb-1.5"
              >
                Image
              </label>
              <div className="flex items-center gap-3 mb-2">
                {form.imageUrl ? (
                  <a
                    href={form.imageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0"
                  >
                    <img
                      src={form.imageUrl}
                      alt="preview"
                      className="w-16 h-16 object-cover border border-gray-200 hover:opacity-80"
                    />
                  </a>
                ) : (
                  <div className="w-16 h-16 bg-gray-100 flex items-center justify-center shrink-0">
                    <ImagePlus size={20} className="text-gray-300" />
                  </div>
                )}
                <div>
                  <ImageUploadTrigger
                    inputRef={imageRef}
                    uploading={uploadingImg}
                    onFileSelect={uploadImage}
                    helpText="1024×1280 px · portrait (4:5) · or paste URL below"
                  />
                </div>
              </div>
              <input
                id="prodImageUrl"
                type="text"
                value={form.imageUrl}
                onChange={(e) => f("imageUrl", e.target.value)}
                placeholder="https://res.cloudinary.com/…"
                className={inputCls}
              />
            </div>

            <div>
              <label
                htmlFor="prodSku"
                className="block text-xs font-medium text-gray-600 mb-1"
              >
                SKU *{" "}
                <span className="font-normal text-gray-400">
                  (copy from OnShopFront POS)
                </span>
              </label>
              <input
                id="prodSku"
                className={inputCls}
                required
                value={form.sku}
                onChange={(e) => f("sku", e.target.value)}
                placeholder="e.g. 11f14fd35826e94a8afc0a0370a541b1"
                spellCheck={false}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="prodName"
                  className="block text-xs font-medium text-gray-600 mb-1"
                >
                  Name *
                </label>
                <input
                  id="prodName"
                  className={inputCls}
                  required
                  value={form.name}
                  onChange={(e) => f("name", e.target.value)}
                />
              </div>
              <div>
                <label
                  htmlFor="prodBrandName"
                  className="block text-xs font-medium text-gray-600 mb-1"
                >
                  Brand
                </label>
                <input
                  id="prodBrandName"
                  className={inputCls}
                  value={form.brandName}
                  onChange={(e) => f("brandName", e.target.value)}
                />
              </div>
            </div>

            {/* Multi-category selector */}
            {(() => {
              const selectCls = `${inputCls} bg-white`;
              const pickerCatNode = catTree.find((c) => c.id === pickerCat);
              const pickerSubNode = pickerCatNode?.children.find(
                (c) => c.id === pickerSub,
              );
              const dropdownProps = {
                selectCls,
                inlineAdd,
                setInlineAdd,
                inlineAddName,
                setInlineAddName,
                onSave: saveInlineAdd,
                isSaving: inlineAddMutation.isPending,
              };
              return (
                <div className="space-y-2">
                  <label
                    htmlFor="prod-cat-select"
                    className="block text-xs font-medium text-gray-600"
                  >
                    Categories *
                  </label>

                  {/* Selected category tags */}
                  {form.categoryIds.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {form.categoryIds.map((id) => {
                        const found = findNodeById(id, catTree);
                        return (
                          <span
                            key={id}
                            className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs font-medium px-2.5 py-1 border border-primary/20"
                          >
                            {found?.path ?? id}
                            <button
                              type="button"
                              onClick={() => removeCategoryId(id)}
                              className="hover:text-red-500 ml-0.5"
                            >
                              ✕
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Cascading picker */}
                  <div className="space-y-2 border border-gray-100 p-3 bg-gray-50/50">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">
                      Add a category
                    </p>
                    <DropdownRow
                      {...dropdownProps}
                      label="Category"
                      addLevel="cat"
                      value={pickerCat}
                      options={catTree}
                      selectId="prod-cat-select"
                      onChange={(v) => {
                        setPickerCat(v);
                        setPickerSub("");
                        setPickerType("");
                      }}
                    />
                    {pickerCatNode && (
                      <DropdownRow
                        {...dropdownProps}
                        label="Subcategory"
                        addLevel="sub"
                        value={pickerSub}
                        options={pickerCatNode.children}
                        onChange={(v) => {
                          setPickerSub(v);
                          setPickerType("");
                        }}
                      />
                    )}
                    {pickerSubNode && pickerSubNode.children.length > 0 && (
                      <DropdownRow
                        {...dropdownProps}
                        label="Type"
                        addLevel="type"
                        value={pickerType}
                        options={pickerSubNode.children}
                        onChange={(v) => setPickerType(v)}
                      />
                    )}
                    <button
                      type="button"
                      onClick={addPickerCategory}
                      disabled={!pickerCat}
                      className="mt-1 text-xs bg-primary text-white px-3 py-1.5 disabled:opacity-40"
                    >
                      + Add
                    </button>
                  </div>
                </div>
              );
            })()}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="prodOriginalPrice"
                  className="block text-xs font-medium text-gray-600 mb-1"
                >
                  Original Price ($) *
                </label>
                <input
                  id="prodOriginalPrice"
                  className={inputCls}
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={form.originalPrice}
                  onChange={(e) => f("originalPrice", e.target.value)}
                />
              </div>
              <div>
                <label
                  htmlFor="prodStock"
                  className="block text-xs font-medium text-gray-600 mb-1"
                >
                  Stock
                </label>
                <input
                  id="prodStock"
                  className={inputCls}
                  type="number"
                  min="0"
                  value={form.stock}
                  onChange={(e) => f("stock", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="prodPromotionType"
                  className="block text-xs font-medium text-gray-600 mb-1"
                >
                  Promotion
                </label>
                <select
                  id="prodPromotionType"
                  className={inputCls}
                  value={form.promotionType}
                  onChange={(e) => {
                    const type = e.target.value;
                    f("promotionType", type);
                    if (type === "NONE") {
                      f("promotionPrice", "");
                      f("promotionPackPrice", "");
                      f("promotionCasePrice", "");
                    }
                  }}
                >
                  <option value="NONE">None</option>
                  <option value="IN_STORE_PROMOTION">In-Store Promotion</option>
                  <option value="CLEARANCE">Clearance Sale</option>
                  <option value="MEMBER">Member Promotion</option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="prodPromotionPrice"
                  className="block text-xs font-medium text-gray-600 mb-1"
                >
                  Promotion Price ($)
                </label>
                <input
                  id="prodPromotionPrice"
                  className={inputCls}
                  type="number"
                  min="0"
                  step="0.01"
                  disabled={form.promotionType === "NONE"}
                  value={form.promotionPrice}
                  onChange={(e) => f("promotionPrice", e.target.value)}
                />
              </div>
            </div>

            <div className="border border-gray-100 p-3 bg-gray-50/40 space-y-2">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">
                Pack &amp; Case Pricing
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="prodPackOf"
                    className="block text-xs font-medium text-gray-600 mb-1"
                  >
                    Pack Of
                  </label>
                  <input
                    id="prodPackOf"
                    className={inputCls}
                    type="number"
                    min="1"
                    value={form.packOf}
                    onChange={(e) => f("packOf", e.target.value)}
                    placeholder="e.g. 6"
                  />
                </div>
                <div>
                  <label
                    htmlFor="prodCaseOf"
                    className="block text-xs font-medium text-gray-600 mb-1"
                  >
                    Case Of
                  </label>
                  <input
                    id="prodCaseOf"
                    className={inputCls}
                    type="number"
                    min="1"
                    value={form.caseOf}
                    onChange={(e) => f("caseOf", e.target.value)}
                    placeholder="e.g. 24"
                  />
                </div>
                <div>
                  <label
                    htmlFor="prodPackPrice"
                    className="block text-xs font-medium text-gray-600 mb-1"
                  >
                    Pack Price ($)
                  </label>
                  <input
                    id="prodPackPrice"
                    className={inputCls}
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.packPrice}
                    onChange={(e) => f("packPrice", e.target.value)}
                    placeholder="e.g. 149.99"
                  />
                </div>
                <div>
                  <label
                    htmlFor="prodCasePrice"
                    className="block text-xs font-medium text-gray-600 mb-1"
                  >
                    Case Price ($)
                  </label>
                  <input
                    id="prodCasePrice"
                    className={inputCls}
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.casePrice}
                    onChange={(e) => f("casePrice", e.target.value)}
                    placeholder="e.g. 549.99"
                  />
                </div>
                <div>
                  <label
                    htmlFor="prodPromotionPackPrice"
                    className="block text-xs font-medium text-gray-600 mb-1"
                  >
                    Promotion Pack Price ($)
                  </label>
                  <input
                    id="prodPromotionPackPrice"
                    className={inputCls}
                    type="number"
                    min="0"
                    step="0.01"
                    disabled={form.promotionType === "NONE"}
                    value={form.promotionPackPrice}
                    onChange={(e) => f("promotionPackPrice", e.target.value)}
                    placeholder="e.g. 119.99"
                  />
                </div>
                <div>
                  <label
                    htmlFor="prodPromotionCasePrice"
                    className="block text-xs font-medium text-gray-600 mb-1"
                  >
                    Promotion Case Price ($)
                  </label>
                  <input
                    id="prodPromotionCasePrice"
                    className={inputCls}
                    type="number"
                    min="0"
                    step="0.01"
                    disabled={form.promotionType === "NONE"}
                    value={form.promotionCasePrice}
                    onChange={(e) => f("promotionCasePrice", e.target.value)}
                    placeholder="e.g. 469.99"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isNew"
                checked={form.isNew}
                onChange={(e) => f("isNew", e.target.checked)}
                className="w-4 h-4 accent-primary"
              />
              <label htmlFor="isNew" className="text-sm text-gray-700">
                Mark as New
              </label>
            </div>

            <div>
              <label
                htmlFor="prodDescription"
                className="block text-xs font-medium text-gray-600 mb-1"
              >
                Description
              </label>
              <textarea
                id="prodDescription"
                className={`${inputCls} resize-none`}
                rows={3}
                value={form.description}
                onChange={(e) => f("description", e.target.value)}
              />
            </div>

            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-1">
              Product Details
            </p>

            <div>
              <label
                htmlFor="prodMaker"
                className="block text-xs font-medium text-gray-600 mb-1"
              >
                Producer / Maker
              </label>
              <input
                id="prodMaker"
                className={inputCls}
                value={form.maker}
                onChange={(e) => f("maker", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="prodCountry"
                  className="block text-xs font-medium text-gray-600 mb-1"
                >
                  Country
                </label>
                <select
                  id="prodCountry"
                  className={`${inputCls} bg-white`}
                  value={form.country}
                  onChange={(e) => {
                    f("country", e.target.value);
                    f("region", "");
                  }}
                >
                  <option value="">— Select —</option>
                  {Country.getAllCountries().map((c) => (
                    <option key={c.isoCode} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="prodRegion"
                  className="block text-xs font-medium text-gray-600 mb-1"
                >
                  Region / State
                </label>
                {(() => {
                  const isoCode = Country.getAllCountries().find(
                    (c) => c.name === form.country,
                  )?.isoCode;
                  const states = isoCode
                    ? State.getStatesOfCountry(isoCode)
                    : [];
                  return states.length > 0 ? (
                    <select
                      id="prodRegion"
                      className={`${inputCls} bg-white`}
                      value={form.region}
                      onChange={(e) => f("region", e.target.value)}
                    >
                      <option value="">— Select —</option>
                      {states.map((s) => (
                        <option key={s.isoCode} value={s.name}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id="prodRegion"
                      className={inputCls}
                      value={form.region}
                      onChange={(e) => f("region", e.target.value)}
                      placeholder="e.g. Barossa Valley"
                    />
                  );
                })()}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3">
              <div>
                <label
                  htmlFor="prodAbv"
                  className="block text-xs font-medium text-gray-600 mb-1"
                >
                  ABV (%)
                </label>
                <input
                  id="prodAbv"
                  className={inputCls}
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.alcoholVolume}
                  onChange={(e) => f("alcoholVolume", e.target.value)}
                />
              </div>
              <div>
                <label
                  htmlFor="prodVolumeMl"
                  className="block text-xs font-medium text-gray-600 mb-1"
                >
                  Volume (mL)
                </label>
                <input
                  id="prodVolumeMl"
                  className={inputCls}
                  type="number"
                  min="0"
                  value={form.volumeMl}
                  onChange={(e) => f("volumeMl", e.target.value)}
                />
              </div>
              <div>
                <label
                  htmlFor="prodVintage"
                  className="block text-xs font-medium text-gray-600 mb-1"
                >
                  Vintage
                </label>
                <input
                  id="prodVintage"
                  className={inputCls}
                  type="number"
                  min="1900"
                  max="2100"
                  value={form.vintage}
                  onChange={(e) => f("vintage", e.target.value)}
                />
              </div>
              <div>
                <label
                  htmlFor="prodClosure"
                  className="block text-xs font-medium text-gray-600 mb-1"
                >
                  Closure
                </label>
                <input
                  id="prodClosure"
                  className={inputCls}
                  value={form.closure}
                  onChange={(e) => f("closure", e.target.value)}
                  placeholder="e.g. screw-cap"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="prodSweetness"
                  className="block text-xs font-medium text-gray-600 mb-1"
                >
                  Sweetness
                </label>
                <input
                  id="prodSweetness"
                  className={inputCls}
                  value={form.sweetness}
                  onChange={(e) => f("sweetness", e.target.value)}
                  placeholder="e.g. dry, off-dry"
                />
              </div>
              <div>
                <label
                  htmlFor="prodWineBody"
                  className="block text-xs font-medium text-gray-600 mb-1"
                >
                  Wine Body
                </label>
                <input
                  id="prodWineBody"
                  className={inputCls}
                  value={form.wineBody}
                  onChange={(e) => f("wineBody", e.target.value)}
                  placeholder="e.g. light, medium, full"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="prodGrapeVariety"
                className="block text-xs font-medium text-gray-600 mb-1"
              >
                Grape Variety
              </label>
              <input
                id="prodGrapeVariety"
                className={inputCls}
                value={form.grapeVariety}
                onChange={(e) => f("grapeVariety", e.target.value)}
                placeholder="e.g. Shiraz, Cabernet Sauvignon"
              />
            </div>

            <div>
              <label
                htmlFor="prodAroma"
                className="block text-xs font-medium text-gray-600 mb-1"
              >
                Aroma
              </label>
              <input
                id="prodAroma"
                className={inputCls}
                value={form.aroma}
                onChange={(e) => f("aroma", e.target.value)}
              />
            </div>

            <div>
              <label
                htmlFor="prodFlavorNotes"
                className="block text-xs font-medium text-gray-600 mb-1"
              >
                Flavour Notes
              </label>
              <input
                id="prodFlavorNotes"
                className={inputCls}
                value={form.flavorNotes}
                onChange={(e) => f("flavorNotes", e.target.value)}
              />
            </div>

            <div>
              <label
                htmlFor="prodIngredients"
                className="block text-xs font-medium text-gray-600 mb-1"
              >
                Ingredients
              </label>
              <input
                id="prodIngredients"
                className={inputCls}
                value={form.ingredients}
                onChange={(e) => f("ingredients", e.target.value)}
                placeholder="e.g. Water, Barley, Hops, Yeast"
              />
            </div>

            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-1">
              Additional Information
            </p>

            <div>
              <label
                htmlFor="prodServingSuggestions"
                className="block text-xs font-medium text-gray-600 mb-1"
              >
                Serving Suggestions
              </label>
              <textarea
                id="prodServingSuggestions"
                className={`${inputCls} resize-none`}
                rows={2}
                value={form.servingSuggestions}
                onChange={(e) => f("servingSuggestions", e.target.value)}
                placeholder="e.g. Serve chilled at 8–10°C"
              />
            </div>

            <div>
              <label
                htmlFor="prodAllergens"
                className="block text-xs font-medium text-gray-600 mb-1"
              >
                Allergens
              </label>
              <input
                id="prodAllergens"
                className={inputCls}
                value={form.allergens}
                onChange={(e) => f("allergens", e.target.value)}
                placeholder="e.g. Contains sulphites"
              />
            </div>

            <div>
              <label
                htmlFor="prodAwards"
                className="block text-xs font-medium text-gray-600 mb-1"
              >
                Awards
              </label>
              <input
                id="prodAwards"
                className={inputCls}
                value={form.awards}
                onChange={(e) => f("awards", e.target.value)}
                placeholder="e.g. Gold — Sydney Royal 2024"
              />
            </div>

            <div>
              <label
                htmlFor="prodStorageInstructions"
                className="block text-xs font-medium text-gray-600 mb-1"
              >
                Storage Instructions
              </label>
              <input
                id="prodStorageInstructions"
                className={inputCls}
                value={form.storageInstructions}
                onChange={(e) => f("storageInstructions", e.target.value)}
                placeholder="e.g. Store in a cool, dark place"
              />
            </div>

            <div>
              <label
                htmlFor="prodFoodRecommendations"
                className="block text-xs font-medium text-gray-600 mb-1"
              >
                Food Recommendations
              </label>
              <textarea
                id="prodFoodRecommendations"
                className={`${inputCls} resize-none`}
                rows={2}
                value={form.foodRecommendations}
                onChange={(e) => f("foodRecommendations", e.target.value)}
                placeholder="e.g. Pairs well with red meat, aged cheese"
              />
            </div>

            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-1">
              Nutritional Information
            </p>

            <div>
              <label
                htmlFor="prodServingSize"
                className="block text-xs font-medium text-gray-600 mb-1"
              >
                Serving Size
              </label>
              <input
                id="prodServingSize"
                className={inputCls}
                value={form.nutritionalInfo.servingSize}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    nutritionalInfo: {
                      ...prev.nutritionalInfo,
                      servingSize: e.target.value,
                    },
                  }))
                }
                placeholder="e.g. 30mL"
              />
            </div>

            <div className="space-y-2">
              {form.nutritionalInfo.rows.length > 0 && (
                <div className="overflow-x-auto border border-gray-200">
                  <table className="min-w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left px-3 py-2 font-medium text-gray-500 w-36">
                          Nutrient
                        </th>
                        <th className="text-left px-3 py-2 font-medium text-gray-500">
                          Per 100mL
                        </th>
                        <th className="text-left px-3 py-2 font-medium text-gray-500">
                          Per Serving
                        </th>
                        <th className="px-2 py-2 w-8" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {form.nutritionalInfo.rows.map((row, idx) => (
                        <tr key={idx}>
                          <td className="px-2 py-1">
                            <input
                              className="w-full border border-gray-200 px-2 py-1 text-xs outline-none"
                              value={row.name}
                              onChange={(e) =>
                                setForm((prev) => ({
                                  ...prev,
                                  nutritionalInfo: {
                                    ...prev.nutritionalInfo,
                                    rows: prev.nutritionalInfo.rows.map(
                                      (r, i) =>
                                        i === idx
                                          ? { ...r, name: e.target.value }
                                          : r,
                                    ),
                                  },
                                }))
                              }
                              placeholder="e.g. Energy"
                            />
                          </td>
                          <td className="px-2 py-1">
                            <input
                              className="w-full border border-gray-200 px-2 py-1 text-xs outline-none"
                              value={row.per100ml}
                              onChange={(e) =>
                                setForm((prev) => ({
                                  ...prev,
                                  nutritionalInfo: {
                                    ...prev.nutritionalInfo,
                                    rows: prev.nutritionalInfo.rows.map(
                                      (r, i) =>
                                        i === idx
                                          ? { ...r, per100ml: e.target.value }
                                          : r,
                                    ),
                                  },
                                }))
                              }
                              placeholder="e.g. 250kJ"
                            />
                          </td>
                          <td className="px-2 py-1">
                            <input
                              className="w-full border border-gray-200 px-2 py-1 text-xs outline-none"
                              value={row.perServing}
                              onChange={(e) =>
                                setForm((prev) => ({
                                  ...prev,
                                  nutritionalInfo: {
                                    ...prev.nutritionalInfo,
                                    rows: prev.nutritionalInfo.rows.map(
                                      (r, i) =>
                                        i === idx
                                          ? { ...r, perServing: e.target.value }
                                          : r,
                                    ),
                                  },
                                }))
                              }
                              placeholder="e.g. 75kJ"
                            />
                          </td>
                          <td className="px-2 py-1">
                            <button
                              type="button"
                              onClick={() =>
                                setForm((prev) => ({
                                  ...prev,
                                  nutritionalInfo: {
                                    ...prev.nutritionalInfo,
                                    rows: prev.nutritionalInfo.rows.filter(
                                      (_, i) => i !== idx,
                                    ),
                                  },
                                }))
                              }
                              className="p-1 text-gray-400 hover:text-red-500"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <button
                type="button"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    nutritionalInfo: {
                      ...prev.nutritionalInfo,
                      rows: [
                        ...prev.nutritionalInfo.rows,
                        { name: "", per100ml: "", perServing: "" },
                      ],
                    },
                  }))
                }
                className="flex items-center gap-1 text-xs text-primary"
              >
                <Plus size={12} /> Add Row
              </button>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setModal(null)}
                className="text-sm text-gray-600 border border-gray-300 px-4 py-2 hover:bg-gray-50"
              >
                Cancel
              </button>
              {(() => {
                const saveLabel =
                  modal === "add" ? "Add Product" : "Save Changes";
                return (
                  <button
                    onClick={save}
                    disabled={saveMutation.isPending}
                    className="text-sm bg-primary text-white px-4 py-2 disabled:opacity-60"
                  >
                    {saveMutation.isPending ? "Saving…" : saveLabel}
                  </button>
                );
              })()}
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Modal */}
      {modal === "delete" && editing && (
        <Modal title="Delete Product" onClose={() => setModal(null)}>
          <p className="text-sm text-gray-600">
            Are you sure you want to delete{" "}
            <strong className="text-gray-900">"{editing.name}"</strong>? This
            cannot be undone.
          </p>
          <DeleteModalActions
            formErr={formErr}
            isPending={deleteMutation.isPending}
            onCancel={() => setModal(null)}
            onDelete={() => deleteMutation.mutate(editing.id)}
          />
        </Modal>
      )}

      {/* Delete All Modal */}
      {modal === "deleteAll" && (
        <Modal title="Delete All Products" onClose={() => setModal(null)}>
          <p className="text-sm text-gray-600">
            This will permanently delete{" "}
            <strong className="text-gray-900">all {total} products</strong>.
            This action cannot be undone.
          </p>
          <DeleteModalActions
            formErr={formErr}
            isPending={deleteAllMutation.isPending}
            onCancel={() => setModal(null)}
            onDelete={() => deleteAllMutation.mutate()}
            confirmLabel="Delete All"
          />
        </Modal>
      )}

      {/* Import Modal */}
      {modal === "import" && (
        <Modal title="Import Products CSV" onClose={() => setModal(null)}>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Upload a CSV file to bulk-create or update products. Existing
              products (matched by SKU) will be updated.
            </p>

            <button
              type="button"
              onClick={downloadTemplate}
              className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-300 px-3 py-2 hover:bg-gray-50 w-fit"
            >
              <Download size={13} /> Download Template
            </button>

            {/* Field reference */}
            <div className="bg-gray-50 p-3 text-xs text-gray-600 space-y-2">
              <p className="font-semibold text-gray-700">Required columns</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>
                  <code className="font-mono bg-gray-200 px-1">
                    sku
                  </code>{" "}
                  — 8-digit internal product code (unique)
                </li>
                <li>
                  <code className="font-mono bg-gray-200 px-1">
                    name
                  </code>{" "}
                  — product name
                </li>
                <li>
                  <code className="font-mono bg-gray-200 px-1">
                    categories
                  </code>{" "}
                  — pipe-separated paths, each as{" "}
                  <code className="font-mono bg-gray-200 px-1">
                    Category/Subcategory/Type
                  </code>{" "}
                  (e.g. <em>Wines/Red Wine|Zero%/Wine</em>). Names must match
                  the catalogue exactly.
                </li>
                <li>
                  <code className="font-mono bg-gray-200 px-1">
                    originalPrice
                  </code>{" "}
                  — numeric, in $
                </li>
              </ul>
              <p className="font-semibold text-gray-700 pt-1">
                Optional columns
              </p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>
                  <code className="font-mono bg-gray-200 px-1">
                    promotionType
                  </code>{" "}
                  — one of{" "}
                  <code className="font-mono bg-gray-200 px-1">
                    NONE
                  </code>
                  ,{" "}
                  <code className="font-mono bg-gray-200 px-1">
                    IN_STORE_PROMOTION
                  </code>
                  ,{" "}
                  <code className="font-mono bg-gray-200 px-1">
                    CLEARANCE
                  </code>
                  ,{" "}
                  <code className="font-mono bg-gray-200 px-1">
                    MEMBER
                  </code>{" "}
                  (defaults to NONE),{" "}
                  <code className="font-mono bg-gray-200 px-1">
                    stock
                  </code>
                  ,{" "}
                  <code className="font-mono bg-gray-200 px-1">
                    isNew
                  </code>{" "}
                  (true/false),{" "}
                  <code className="font-mono bg-gray-200 px-1">
                    imageUrl
                  </code>
                </li>
                <li>
                  <code className="font-mono bg-gray-200 px-1">
                    promotionPrice
                  </code>{" "}
                  — the discounted price for the chosen promotionType (numeric,
                  $)
                </li>
                <li>
                  <code className="font-mono bg-gray-200 px-1">
                    promotionPackPrice
                  </code>
                  ,{" "}
                  <code className="font-mono bg-gray-200 px-1">
                    promotionCasePrice
                  </code>{" "}
                  — discounted pack/case totals for the chosen promotionType
                  (numeric, $)
                </li>
                <li>
                  <code className="font-mono bg-gray-200 px-1">
                    alcoholVolume
                  </code>{" "}
                  (%),{" "}
                  <code className="font-mono bg-gray-200 px-1">
                    volumeMl
                  </code>
                  ,{" "}
                  <code className="font-mono bg-gray-200 px-1">
                    vintage
                  </code>
                  ,{" "}
                  <code className="font-mono bg-gray-200 px-1">
                    packOf
                  </code>
                  ,{" "}
                  <code className="font-mono bg-gray-200 px-1">
                    packPrice
                  </code>
                  ,{" "}
                  <code className="font-mono bg-gray-200 px-1">
                    caseOf
                  </code>
                  ,{" "}
                  <code className="font-mono bg-gray-200 px-1">
                    casePrice
                  </code>
                </li>
                <li>
                  <code className="font-mono bg-gray-200 px-1">
                    country
                  </code>
                  ,{" "}
                  <code className="font-mono bg-gray-200 px-1">
                    region
                  </code>
                  ,{" "}
                  <code className="font-mono bg-gray-200 px-1">
                    maker
                  </code>
                  ,{" "}
                  <code className="font-mono bg-gray-200 px-1">
                    brandName
                  </code>
                </li>
                <li>
                  <code className="font-mono bg-gray-200 px-1">
                    sweetness
                  </code>
                  ,{" "}
                  <code className="font-mono bg-gray-200 px-1">
                    wineBody
                  </code>
                  ,{" "}
                  <code className="font-mono bg-gray-200 px-1">
                    closure
                  </code>
                  ,{" "}
                  <code className="font-mono bg-gray-200 px-1">
                    grapeVariety
                  </code>
                  ,{" "}
                  <code className="font-mono bg-gray-200 px-1">
                    flavorNotes
                  </code>
                  ,{" "}
                  <code className="font-mono bg-gray-200 px-1">
                    aroma
                  </code>
                  ,{" "}
                  <code className="font-mono bg-gray-200 px-1">
                    ingredients
                  </code>
                  ,{" "}
                  <code className="font-mono bg-gray-200 px-1">
                    description
                  </code>
                </li>
              </ul>
              <p className="text-gray-500 pt-1">
                Download the template for a complete column reference with an
                example row.
              </p>
            </div>

            {importResult && (
              <div className="bg-gray-50 p-3 text-sm">
                <p className="text-green-700 font-medium">
                  Created: {importResult.created} · Updated:{" "}
                  {importResult.updated}
                </p>
                {importResult.errors.length > 0 && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-red-600 font-medium text-xs">
                        Errors ({importResult.errors.length}):
                      </p>
                      {lastImportJobId && (
                        <button
                          type="button"
                          onClick={() =>
                            void downloadFailedCsv(lastImportJobId)
                          }
                          className="flex items-center gap-1 text-xs text-red-600 border border-red-200 px-2 py-0.5 hover:bg-red-50"
                        >
                          <Download size={11} /> Download failed rows
                        </button>
                      )}
                    </div>
                    <ul className="mt-1 space-y-0.5 text-xs text-red-500 max-h-32 overflow-y-auto">
                      {importResult.errors.map((e) => (
                        <li key={e}>{e}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {importing ? (
              <div className="py-4 space-y-2">
                <p className="text-sm text-gray-500 text-center">
                  {importProgress
                    ? `Processing… ${importProgress.processed} / ${importProgress.total} rows (${importProgress.created} created, ${importProgress.updated} updated)`
                    : "Uploading…"}
                </p>
                {importProgress && importProgress.total > 0 && (
                  <div className="w-full bg-gray-200 h-1.5">
                    <div
                      className="bg-primary h-1.5"
                      style={{
                        width: `${Math.round((importProgress.processed / importProgress.total) * 100)}%`,
                      }}
                    />
                  </div>
                )}
              </div>
            ) : (
              <CsvDropzone onFileSelect={(file) => void importCsv(file)} />
            )}
          </div>
        </Modal>
      )}

      {/* POS Data Upload Modal */}
      {modal === "pos" && (
        <Modal title="Upload POS Data" onClose={() => setModal(null)}>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Upload a price list exported from your POS to update existing
              products' price, stock and pack/case sizes by SKU. Column names
              can be anything — map them to the fields below.
            </p>

            <button
              type="button"
              onClick={downloadPosTemplate}
              className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-300 px-3 py-2 hover:bg-gray-50 w-fit"
            >
              <Download size={13} /> Download Template
            </button>

            <FormError message={posErr} />

            {posResult && (
              <div className="bg-gray-50 p-3 text-sm">
                <p className="text-green-700 font-medium">
                  Updated: {posResult.updated}
                  {posResult.notFound > 0 &&
                    ` · Not found: ${posResult.notFound}`}
                  {posResult.zeroedOutOfStock > 0 &&
                    ` · Zeroed out of stock: ${posResult.zeroedOutOfStock}`}
                </p>
                {posResult.errors.length > 0 && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-red-600 font-medium text-xs">
                        Errors ({posResult.errors.length}):
                      </p>
                      {posResult.failedRows.length > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            downloadFailedRows(
                              posResult.failedRows,
                              "pos_import_failed.csv",
                            )
                          }
                          className="flex items-center gap-1 text-xs text-red-600 border border-red-200 px-2 py-0.5 hover:bg-red-50"
                        >
                          <Download size={11} /> Download failed rows
                        </button>
                      )}
                    </div>
                    <ul className="mt-1 space-y-0.5 text-xs text-red-500 max-h-32 overflow-y-auto">
                      {posResult.errors.map((e) => (
                        <li key={e}>{e}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {posHeaders.length === 0 ? (
              <CsvDropzone
                onFileSelect={(file) => void handlePosFileSelect(file)}
              />
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-gray-500 truncate">
                    {posFile?.name} — match each field to a column
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setPosFile(null);
                      setPosHeaders([]);
                      setPosMap({});
                      setPosResult(null);
                    }}
                    className="text-xs text-gray-400 hover:text-gray-700 shrink-0"
                  >
                    Change file
                  </button>
                </div>
                <div className="space-y-2 border border-gray-100 p-3 bg-gray-50/50">
                  {POS_FIELDS.map(({ key, label, required }) => (
                    <div
                      key={key}
                      className="flex items-center justify-between gap-3"
                    >
                      <label
                        htmlFor={`pos-field-${key}`}
                        className="text-xs font-medium text-gray-600 shrink-0"
                      >
                        {label}
                        {required && " *"}
                      </label>
                      <select
                        id={`pos-field-${key}`}
                        className={`${inputCls} bg-white max-w-[60%]`}
                        value={posMap[key] ?? ""}
                        onChange={(e) =>
                          setPosMap((prev) => ({
                            ...prev,
                            [key]: e.target.value || undefined,
                          }))
                        }
                      >
                        <option value="">
                          {required ? "— Select —" : "— Not in file —"}
                        </option>
                        {posHeaders.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>

                <label className="flex items-start gap-2 text-xs text-gray-600 bg-amber-50 border border-amber-100 p-3">
                  <input
                    type="checkbox"
                    className="mt-0.5 accent-primary"
                    checked={posFullSync}
                    onChange={(e) => setPosFullSync(e.target.checked)}
                  />
                  <span>
                    This is the full stock list — set stock to{" "}
                    <strong>0</strong> for any existing product not included in
                    this file.
                  </span>
                </label>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setModal(null)}
                    className="text-sm text-gray-600 border border-gray-300 px-4 py-2 hover:bg-gray-50"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => void submitPosImport()}
                    disabled={!posMap.sku || posImporting}
                    className="text-sm bg-primary text-white px-4 py-2 disabled:opacity-60"
                  >
                    {posImporting ? "Importing…" : "Import"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Compare modal */}
      {compareProduct && (
        <CompareModal
          productId={compareProduct.id}
          productName={compareProduct.name}
          ourPrice={compareProduct.ourPrice}
          onClose={() => setCompareProduct(null)}
        />
      )}
    </div>
  );
}
