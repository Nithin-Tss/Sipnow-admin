import React, { useState } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { ToggleLeft, ToggleRight, ChevronDown } from "lucide-react";
import { api } from "../lib/api";
import PaginationBar from "../components/PaginationBar";
import SearchInput from "../components/SearchInput";
import TableStateRow from "../components/TableStateRow";

const PER_PAGE = 20;

function fmt(iso) {
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function GiftCards() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-gift-cards", page, search],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PER_PAGE),
      });
      if (search) params.set("search", search);
      return api.get(`/gift-cards/admin?${params}`);
    },
    placeholderData: keepPreviousData,
  });

  const toggleMutation = useMutation({
    mutationFn: (id) => api.patch(`/gift-cards/${id}/toggle`, {}),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["admin-gift-cards"] }),
  });

  const cards = data?.cards ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <h2 className="text-xl font-semibold text-gray-900">Gift Cards</h2>
        {total > 0 && <p className="text-sm text-gray-400">{total} total</p>}
      </div>

      <div className="flex items-center gap-3 mb-4">
        <SearchInput
          className="max-w-xs flex-1"
          placeholder="Search by code, name or email…"
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
        />
      </div>

      {error && <p className="text-sm text-red-500 mb-4">{error.message}</p>}

      <div className="bg-white border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">
                  Code
                </th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">
                  Recipient
                </th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">
                  Amount
                </th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">
                  Balance
                </th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">
                  Purchased
                </th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">
                  Payment
                </th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">
                  Status
                </th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(() => {
                if (isLoading) {
                  return <TableStateRow colSpan={8}>Loading…</TableStateRow>;
                }
                if (cards.length === 0) {
                  return (
                    <TableStateRow colSpan={8}>
                      No gift cards found
                    </TableStateRow>
                  );
                }
                return cards.map((card) => (
                  <React.Fragment key={card.id}>
                    <tr className="hover:bg-gray-50/60">
                      <td className="px-4 py-3 font-mono text-xs text-gray-700">
                        {card.code}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 truncate max-w-40">
                          {card.recipientName}
                        </p>
                        <p className="text-xs text-gray-400 truncate max-w-40">
                          {card.recipientEmail}
                        </p>
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-900">
                        $ {card.amount.toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`font-semibold ${card.balance <= 0 ? "text-gray-400" : "text-green-600"}`}
                        >
                          $ {card.balance.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {fmt(card.purchasedAt)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="border border-gray-400 text-gray-800 px-2 py-0.5 text-xs uppercase tracking-wide">
                          {card.paymentStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="border border-gray-400 text-gray-800 px-2 py-0.5 text-xs uppercase tracking-wide">
                          {card.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleMutation.mutate(card.id)}
                            disabled={toggleMutation.isPending}
                            title={card.isActive ? "Deactivate" : "Activate"}
                            className="text-gray-400 hover:text-primary disabled:opacity-40"
                          >
                            {card.isActive ? (
                              <ToggleRight size={18} />
                            ) : (
                              <ToggleLeft size={18} />
                            )}
                          </button>
                          {card.redemptions.length > 0 && (
                            <button
                              onClick={() =>
                                setExpanded(
                                  expanded === card.id ? null : card.id,
                                )
                              }
                              title="View redemptions"
                              className="text-gray-400 hover:text-primary"
                            >
                              <ChevronDown
                                size={15}
                                className={
                                  expanded === card.id ? "rotate-180" : ""
                                }
                              />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expanded === card.id &&
                      card.redemptions.map((r) => (
                        <tr key={r.orderId} className="bg-purple-50/50">
                          <td
                            colSpan={2}
                            className="pl-10 pr-4 py-2 text-xs text-gray-500 font-mono"
                          >
                            Order #{r.orderId.slice(-8).toUpperCase()}
                          </td>
                          <td
                            colSpan={2}
                            className="px-4 py-2 text-xs text-purple-700 font-semibold"
                          >
                            − $ {r.amount.toFixed(2)}
                          </td>
                          <td className="px-4 py-2 text-xs text-gray-400">
                            {fmt(r.createdAt)}
                          </td>
                          <td colSpan={3} />
                        </tr>
                      ))}
                  </React.Fragment>
                ));
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
    </div>
  );
}
