import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAllProducts } from "../lib/mockProducts";
import { inputCls } from "../lib/ui";

const ROWS = [
  { key: "category", label: "Category" },
  { key: "price", label: "Price", render: (v) => `$${Number(v).toFixed(2)}` },
  { key: "stockQuantity", label: "Stock" },
  { key: "abv", label: "ABV" },
  { key: "volume", label: "Volume" },
  { key: "manufacturer", label: "Manufacturer" },
  { key: "origin", label: "Origin" },
  { key: "description", label: "Description" },
];

export default function Compare() {
  const { data, isLoading } = useQuery({
    queryKey: ["compare-products"],
    queryFn: fetchAllProducts,
  });
  const [leftId, setLeftId] = useState("");
  const [rightId, setRightId] = useState("");

  const products = data ?? [];
  const left = products.find((p) => p._id === leftId);
  const right = products.find((p) => p._id === rightId);

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-gray-900">Compare</h2>
      <p className="mt-1 text-sm text-gray-500">
        Pick two products to compare side by side.
      </p>

      {isLoading ? (
        <p className="mt-4 text-sm text-gray-400">Loading…</p>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-4 max-w-2xl">
            <select
              className={inputCls}
              value={leftId}
              onChange={(e) => setLeftId(e.target.value)}
            >
              <option value="">Select a product…</option>
              {products.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
            <select
              className={inputCls}
              value={rightId}
              onChange={(e) => setRightId(e.target.value)}
            >
              <option value="">Select a product…</option>
              {products.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {left && right ? (
            <div className="mt-6 bg-white border border-gray-200 max-w-2xl">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                    <th className="px-4 py-2.5 font-medium">Attribute</th>
                    <th className="px-4 py-2.5 font-medium">{left.name}</th>
                    <th className="px-4 py-2.5 font-medium">{right.name}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {ROWS.map((row) => (
                    <tr key={row.key}>
                      <td className="px-4 py-2.5 text-gray-500">{row.label}</td>
                      <td className="px-4 py-2.5 text-gray-900">
                        {row.render
                          ? row.render(left[row.key])
                          : left[row.key] || "—"}
                      </td>
                      <td className="px-4 py-2.5 text-gray-900">
                        {row.render
                          ? row.render(right[row.key])
                          : right[row.key] || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-6 text-sm text-gray-400">
              Select two products above to see a comparison.
            </p>
          )}
        </>
      )}
    </div>
  );
}
