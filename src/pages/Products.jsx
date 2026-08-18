import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { apiFetch } from "../lib/api";
import { inputCls } from "../lib/ui";
import SearchInput from "../components/SearchInput";
import PaginationBar from "../components/PaginationBar";
import TableStateRow from "../components/TableStateRow";
import Modal from "../components/Modal";
import FormError from "../components/FormError";
import DeleteModalActions from "../components/DeleteModalActions";

const EMPTY_FORM = {
  name: "",
  category: "",
  categoryGroup: "wine",
  price: "",
  image: "",
  inStock: true,
  stockQuantity: "",
  abv: "",
  volume: "",
  manufacturer: "",
  origin: "",
  description: "",
};

const PER_PAGE = 20;

export default function Products() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null); // product object, or {} for new
  const [deleting, setDeleting] = useState(null); // product object

  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["products", search, page],
    queryFn: () =>
      apiFetch(
        `/api/products?page=${page}&limit=${PER_PAGE}&q=${encodeURIComponent(search)}`,
      ),
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
        ? apiFetch(`/api/products/${payload.id}`, {
            method: "PUT",
            body: JSON.stringify(payload.body),
          })
        : apiFetch(`/api/products`, {
            method: "POST",
            body: JSON.stringify(payload.body),
          }),
    onSuccess: () => {
      invalidate();
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => apiFetch(`/api/products/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      invalidate();
      setDeleting(null);
    },
  });

  function openCreate() {
    saveMutation.reset();
    setEditing({ isNew: true, ...EMPTY_FORM });
  }

  function openEdit(product) {
    saveMutation.reset();
    setEditing({
      isNew: false,
      id: product._id,
      name: product.name,
      category: product.category,
      categoryGroup: product.categoryGroup,
      price: String(product.price),
      image: product.image || "",
      inStock: product.inStock,
      stockQuantity: String(product.stockQuantity ?? 0),
      abv: product.abv || "",
      volume: product.volume || "",
      manufacturer: product.manufacturer || "",
      origin: product.origin || "",
      description: product.description || "",
    });
  }

  function handleSubmit(e) {
    e.preventDefault();
    const body = {
      name: editing.name.trim(),
      category: editing.category.trim(),
      categoryGroup: editing.categoryGroup,
      price: Number(editing.price),
      image: editing.image.trim(),
      inStock: editing.inStock,
      stockQuantity: Number(editing.stockQuantity) || 0,
      abv: editing.abv.trim(),
      volume: editing.volume.trim(),
      manufacturer: editing.manufacturer.trim(),
      origin: editing.origin.trim(),
      description: editing.description.trim(),
    };
    saveMutation.mutate({ id: editing.isNew ? null : editing.id, body });
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Products</h2>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 bg-primary text-white text-sm px-4 py-2 hover:opacity-90"
        >
          <Plus size={14} /> Add Product
        </button>
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

      <div className="mt-4 bg-white border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
              <th className="px-4 py-2.5 font-medium">Name</th>
              <th className="px-4 py-2.5 font-medium">Category</th>
              <th className="px-4 py-2.5 font-medium">Price</th>
              <th className="px-4 py-2.5 font-medium">Stock</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading && <TableStateRow colSpan={6}>Loading…</TableStateRow>}
            {isError && (
              <TableStateRow colSpan={6}>
                Failed to load products: {error.message}
              </TableStateRow>
            )}
            {!isLoading && !isError && items.length === 0 && (
              <TableStateRow colSpan={6}>No products found.</TableStateRow>
            )}
            {items.map((p) => (
              <tr key={p._id} className="hover:bg-gray-50">
                <td className="px-4 py-2.5 text-gray-900">{p.name}</td>
                <td className="px-4 py-2.5 text-gray-600">{p.category}</td>
                <td className="px-4 py-2.5 text-gray-600">
                  ${p.price.toFixed(2)}
                </td>
                <td className="px-4 py-2.5 text-gray-600">{p.stockQuantity}</td>
                <td className="px-4 py-2.5">
                  <span
                    className={`px-2 py-0.5 text-xs ${
                      p.inStock
                        ? "bg-green-50 text-green-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {p.inStock ? "In Stock" : "Out of Stock"}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => openEdit(p)}
                      className="p-1.5 text-gray-500 hover:text-primary"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setDeleting(p)}
                      className="p-1.5 text-gray-500 hover:text-red-600"
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
          onClose={() => setEditing(null)}
        >
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input
                required
                placeholder="Name"
                className={`${inputCls} col-span-2`}
                value={editing.name}
                onChange={(e) =>
                  setEditing({ ...editing, name: e.target.value })
                }
              />
              <input
                required
                placeholder="Category (e.g. Red Wine · 750mL)"
                className={inputCls}
                value={editing.category}
                onChange={(e) =>
                  setEditing({ ...editing, category: e.target.value })
                }
              />
              <select
                className={inputCls}
                value={editing.categoryGroup}
                onChange={(e) =>
                  setEditing({ ...editing, categoryGroup: e.target.value })
                }
              >
                <option value="wine">Wine</option>
                <option value="spirits">Spirits</option>
                <option value="beer">Beer</option>
                <option value="offers">Offers</option>
              </select>
              <input
                required
                type="number"
                step="0.01"
                min="0"
                placeholder="Price"
                className={inputCls}
                value={editing.price}
                onChange={(e) =>
                  setEditing({ ...editing, price: e.target.value })
                }
              />
              <input
                type="number"
                min="0"
                placeholder="Stock quantity"
                className={inputCls}
                value={editing.stockQuantity}
                onChange={(e) =>
                  setEditing({ ...editing, stockQuantity: e.target.value })
                }
              />
              <input
                placeholder="Image URL"
                className={`${inputCls} col-span-2`}
                value={editing.image}
                onChange={(e) =>
                  setEditing({ ...editing, image: e.target.value })
                }
              />
              <input
                placeholder="ABV (e.g. 13.5%)"
                className={inputCls}
                value={editing.abv}
                onChange={(e) =>
                  setEditing({ ...editing, abv: e.target.value })
                }
              />
              <input
                placeholder="Volume (e.g. 750mL)"
                className={inputCls}
                value={editing.volume}
                onChange={(e) =>
                  setEditing({ ...editing, volume: e.target.value })
                }
              />
              <input
                placeholder="Manufacturer"
                className={inputCls}
                value={editing.manufacturer}
                onChange={(e) =>
                  setEditing({ ...editing, manufacturer: e.target.value })
                }
              />
              <input
                placeholder="Origin"
                className={inputCls}
                value={editing.origin}
                onChange={(e) =>
                  setEditing({ ...editing, origin: e.target.value })
                }
              />
              <textarea
                placeholder="Description"
                className={`${inputCls} col-span-2`}
                rows={3}
                value={editing.description}
                onChange={(e) =>
                  setEditing({ ...editing, description: e.target.value })
                }
              />
              <label className="col-span-2 flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={editing.inStock}
                  onChange={(e) =>
                    setEditing({ ...editing, inStock: e.target.checked })
                  }
                />
                In stock
              </label>
            </div>

            <FormError message={saveMutation.error?.message} />

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
    </div>
  );
}
