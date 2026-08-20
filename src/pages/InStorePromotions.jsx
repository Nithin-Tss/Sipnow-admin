import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Tag } from "lucide-react";
import {
  fetchInStorePromotions,
  createInStorePromotion,
  updateInStorePromotion,
  deleteInStorePromotion,
} from "../lib/inStorePromotionsApi";
import { fetchAllProducts } from "../lib/productsApi";
import { inputCls } from "../lib/ui";
import SearchInput from "../components/SearchInput";
import PaginationBar from "../components/PaginationBar";
import TableStateRow from "../components/TableStateRow";
import Modal from "../components/Modal";
import FormError from "../components/FormError";
import DeleteModalActions from "../components/DeleteModalActions";

const PER_PAGE = 20;

const EMPTY_FORM = {
  productId: "",
  isActive: true,
  displayOrder: 1,
  promoLabel: "In-store only",
  discountType: "none",
  discountValue: 0,
  startDate: "",
  endDate: "",
};

export default function InStorePromotions() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [formError, setFormError] = useState("");

  const queryClient = useQueryClient();

  const {
    data: promotions = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["inStorePromotions"],
    queryFn: fetchInStorePromotions,
  });

  const { data: allProducts = [] } = useQuery({
    queryKey: ["allProductsForInStorePromos"],
    queryFn: fetchAllProducts,
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["inStorePromotions"] });
  }

  const saveMutation = useMutation({
    mutationFn: (payload) =>
      payload.id
        ? updateInStorePromotion(payload.id, payload.body)
        : createInStorePromotion(payload.body),
    onSuccess: () => {
      invalidate();
      setEditing(null);
      setFormError("");
    },
    onError: (err) => {
      setFormError(err.message || "Failed to save In-Store Promotion.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteInStorePromotion(id),
    onSuccess: () => {
      invalidate();
      setDeleting(null);
    },
  });

  const filteredItems = useMemo(() => {
    if (!search.trim()) return promotions;
    const q = search.trim().toLowerCase();
    return promotions.filter((item) => {
      const p = item.product || {};
      const nameMatch = (p.name || "").toLowerCase().includes(q);
      const skuMatch = (p.sku || "").toLowerCase().includes(q);
      const labelMatch = (item.promoLabel || "").toLowerCase().includes(q);
      return nameMatch || skuMatch || labelMatch;
    });
  }, [promotions, search]);

  const total = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const pagedItems = useMemo(() => {
    const start = (page - 1) * PER_PAGE;
    return filteredItems.slice(start, start + PER_PAGE);
  }, [filteredItems, page]);

  function openCreate() {
    saveMutation.reset();
    setFormError("");
    setEditing({ isNew: true, ...EMPTY_FORM });
  }

  function openEdit(item) {
    saveMutation.reset();
    setFormError("");
    const pId = item.product?._id || item.product?.id || item.product || "";
    setEditing({
      id: item._id,
      isNew: false,
      productId: pId,
      isActive: Boolean(item.isActive),
      displayOrder: item.displayOrder ?? 1,
      promoLabel: item.promoLabel || "In-store only",
      discountType: item.discountType || "none",
      discountValue: item.discountValue ?? 0,
      startDate: item.startDate ? item.startDate.split("T")[0] : "",
      endDate: item.endDate ? item.endDate.split("T")[0] : "",
    });
  }

  function handleSubmit(e) {
    e.preventDefault();
    setFormError("");

    if (!editing.productId) {
      setFormError("Please select a product for the promotion.");
      return;
    }

    if (
      editing.startDate &&
      editing.endDate &&
      editing.startDate > editing.endDate
    ) {
      setFormError("End date cannot be earlier than start date.");
      return;
    }

    if (editing.isActive) {
      const duplicate = promotions.find(
        (p) =>
          p._id !== editing.id &&
          (p.product?._id === editing.productId ||
            p.product === editing.productId) &&
          p.isActive,
      );
      if (duplicate) {
        setFormError(
          "This product is already added as an active In-Store Promotion.",
        );
        return;
      }
    }

    const body = {
      productId: editing.productId,
      isActive: editing.isActive,
      displayOrder: Number(editing.displayOrder) || 1,
      promoLabel: editing.promoLabel || "In-store only",
      discountType: editing.discountType,
      discountValue: Number(editing.discountValue) || 0,
      startDate: editing.startDate || null,
      endDate: editing.endDate || null,
    };

    saveMutation.mutate({ id: editing.isNew ? null : editing.id, body });
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            In-Store Promotions
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage product offers and promotions displayed in-store to
            customers.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 bg-primary text-white text-sm px-4 py-2 hover:opacity-90"
        >
          <Plus size={14} /> Add In-Store Promotion
        </button>
      </div>

      <div className="mt-4 max-w-sm">
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Search in-store promotions…"
        />
      </div>

      <div className="mt-4 bg-white border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
              <th className="px-4 py-2.5 font-medium">PRODUCT</th>
              <th className="px-4 py-2.5 font-medium">SKU</th>
              <th className="px-4 py-2.5 font-medium">PRICE</th>
              <th className="px-4 py-2.5 font-medium">DISCOUNT</th>
              <th className="px-4 py-2.5 font-medium">ORDER</th>
              <th className="px-4 py-2.5 font-medium">STATUS</th>
              <th className="px-4 py-2.5 font-medium text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading && <TableStateRow colSpan={7}>Loading…</TableStateRow>}
            {isError && (
              <TableStateRow colSpan={7}>
                Failed to load in-store promotions: {error.message}
              </TableStateRow>
            )}
            {!isLoading && !isError && pagedItems.length === 0 && (
              <TableStateRow colSpan={7}>
                No in-store promotions found.
              </TableStateRow>
            )}
            {pagedItems.map((item) => {
              const p = item.product || {};
              return (
                <tr key={item._id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-gray-600">
                    <div className="flex items-center gap-2.5">
                      {p.image ? (
                        <img
                          src={p.image}
                          alt={p.name}
                          className="w-7 h-7 rounded object-cover border border-gray-200"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded bg-gray-100 flex items-center justify-center text-gray-400">
                          <Tag size={12} />
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-gray-900">
                          {p.name || "Unknown Product"}
                        </div>
                        {p.category && (
                          <div className="text-[11px] text-gray-400">
                            {p.category}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">{p.sku || "—"}</td>
                  <td className="px-4 py-2.5 text-gray-600">
                    {p.price !== undefined
                      ? `$${Number(p.price).toFixed(2)}`
                      : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">
                    {item.discountType === "percentage" && (
                      <span className="px-2 py-0.5 text-xs bg-blue-50 text-blue-700">
                        {item.discountValue}% OFF
                      </span>
                    )}
                    {item.discountType === "fixed" && (
                      <span className="px-2 py-0.5 text-xs bg-purple-50 text-purple-700">
                        ${Number(item.discountValue).toFixed(2)} OFF
                      </span>
                    )}
                    {(!item.discountType || item.discountType === "none") && (
                      <span className="text-gray-400 text-xs">Standard</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">
                    {item.displayOrder ?? 1}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`px-2 py-0.5 text-xs ${
                        item.isActive
                          ? "bg-green-50 text-green-700"
                          : "bg-red-50 text-red-700"
                      }`}
                    >
                      {item.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEdit(item)}
                        className="p-1.5 text-gray-500 hover:text-primary"
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => setDeleting(item)}
                        className="p-1.5 text-gray-500 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
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
          title={
            editing.isNew ? "Add In-Store Promotion" : "Edit In-Store Promotion"
          }
          onClose={() => setEditing(null)}
        >
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Select Product <span className="text-red-500">*</span>
                </label>
                <select
                  className={inputCls}
                  value={editing.productId}
                  disabled={!editing.isNew}
                  onChange={(e) =>
                    setEditing({ ...editing, productId: e.target.value })
                  }
                  required
                >
                  <option value="">-- Choose a Product --</option>
                  {allProducts.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} {p.sku ? `(${p.sku})` : ""} - $
                      {Number(p.price).toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Discount Type
                </label>
                <select
                  className={inputCls}
                  value={editing.discountType}
                  onChange={(e) =>
                    setEditing({ ...editing, discountType: e.target.value })
                  }
                >
                  <option value="none">None (Standard Price)</option>
                  <option value="percentage">Percentage Discount (%)</option>
                  <option value="fixed">Fixed Amount Discount ($)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Discount Value
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={inputCls}
                  value={editing.discountValue}
                  onChange={(e) =>
                    setEditing({ ...editing, discountValue: e.target.value })
                  }
                  placeholder="e.g. 10"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Display Order
                </label>
                <input
                  type="number"
                  min="1"
                  className={inputCls}
                  value={editing.displayOrder}
                  onChange={(e) =>
                    setEditing({ ...editing, displayOrder: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Promo Badge Label
                </label>
                <input
                  type="text"
                  className={inputCls}
                  value={editing.promoLabel}
                  onChange={(e) =>
                    setEditing({ ...editing, promoLabel: e.target.value })
                  }
                  placeholder="e.g. In-store only"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Start Date (Optional)
                </label>
                <input
                  type="date"
                  className={inputCls}
                  value={editing.startDate}
                  onChange={(e) =>
                    setEditing({ ...editing, startDate: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  End Date (Optional)
                </label>
                <input
                  type="date"
                  className={inputCls}
                  value={editing.endDate}
                  onChange={(e) =>
                    setEditing({ ...editing, endDate: e.target.value })
                  }
                />
              </div>

              <label className="col-span-2 flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={editing.isActive}
                  onChange={(e) =>
                    setEditing({ ...editing, isActive: e.target.checked })
                  }
                />
                Active (visible on customer storefront)
              </label>
            </div>

            <FormError message={formError || saveMutation.error?.message} />

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="text-sm text-gray-600 border border-gray-300 px-4 py-2 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saveMutation.isPending}
                className="text-sm bg-primary text-white px-4 py-2 hover:opacity-90 disabled:opacity-60"
              >
                {saveMutation.isPending ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleting && (
        <Modal
          title="Remove In-Store Promotion"
          onClose={() => setDeleting(null)}
        >
          <div className="space-y-2 text-sm text-gray-600">
            <p>
              Are you sure you want to remove{" "}
              <strong>{deleting.product?.name || "this promotion"}</strong> from
              In-Store Promotions?
            </p>
            <p className="text-xs text-gray-500 italic bg-amber-50 text-amber-800 p-2 border border-amber-100">
              Note: This will only remove the product from the In-Store
              Promotions list. The actual Product record will remain untouched.
            </p>
          </div>
          <DeleteModalActions
            formErr={deleteMutation.error?.message}
            isPending={deleteMutation.isPending}
            onCancel={() => setDeleting(null)}
            onDelete={() => deleteMutation.mutate(deleting._id)}
          />
        </Modal>
      )}
    </div>
  );
}
