import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAllProducts, updateProduct } from "../lib/mockProducts";
import SearchInput from "../components/SearchInput";
import TableStateRow from "../components/TableStateRow";

export default function Stock() {
  const [search, setSearch] = useState("");
  const [drafts, setDrafts] = useState({});
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

  const products = (data ?? []).filter((p) =>
    p.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

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
      <h2 className="text-xl font-semibold text-gray-900">Stock</h2>
      <p className="mt-1 text-sm text-gray-500">
        Adjust stock quantities and availability for existing products.
      </p>

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
    </div>
  );
}
