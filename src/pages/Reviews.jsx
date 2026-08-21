import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, Check, EyeOff } from "lucide-react";
import { reviewsStore as store } from "../lib/entityStores";
import { inputCls } from "../lib/ui";
import SearchInput from "../components/SearchInput";
import PaginationBar from "../components/PaginationBar";
import TableStateRow from "../components/TableStateRow";
import Modal from "../components/Modal";
import DeleteModalActions from "../components/DeleteModalActions";

const PER_PAGE = 20;

const STATUS_STYLES = {
  pending: "bg-yellow-50 text-yellow-700",
  approved: "bg-green-50 text-green-700",
  hidden: "bg-gray-100 text-gray-600",
};

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "hidden", label: "Hidden" },
];

export default function Reviews() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState(null);

  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["reviews", search, status, page],
    queryFn: () => store.list({ search, status, page, perPage: PER_PAGE }),
    placeholderData: (prev) => prev,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["reviews"] });
  }

  const statusMutation = useMutation({
    mutationFn: ({ id, status: newStatus }) =>
      store.updateStatus(id, newStatus),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => store.remove(id),
    onSuccess: () => {
      invalidate();
      setDeleting(null);
    },
  });

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-gray-900">Reviews</h2>
      <p className="mt-1 text-xs text-gray-500">
        Moderate customer reviews — approve or hide. There is no admin
        create/edit for review content.
      </p>

      <div className="mt-4 flex items-center gap-3 max-w-2xl">
        <div className="max-w-sm flex-1">
          <SearchInput
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Search by product or customer…"
          />
        </div>
        <select
          className={inputCls}
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/60 text-left text-xs text-gray-500">
              <th className="px-4 py-2.5 font-medium">Product</th>
              <th className="px-4 py-2.5 font-medium">Customer</th>
              <th className="px-4 py-2.5 font-medium">Rating</th>
              <th className="px-4 py-2.5 font-medium">Comment</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading && <TableStateRow colSpan={6}>Loading…</TableStateRow>}
            {isError && (
              <TableStateRow colSpan={6}>
                Failed to load reviews: {error.message}
              </TableStateRow>
            )}
            {!isLoading && !isError && items.length === 0 && (
              <TableStateRow colSpan={6}>No reviews found.</TableStateRow>
            )}
            {items.map((r) => (
              <tr key={r._id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-2.5 text-gray-900">
                  {r.product?.name || "—"}
                </td>
                <td className="px-4 py-2.5 text-gray-600">
                  {r.user?.name || "—"}
                </td>
                <td className="px-4 py-2.5 text-gray-600">{r.rating} / 5</td>
                <td className="px-4 py-2.5 text-gray-600 max-w-xs truncate">
                  {r.comment}
                </td>
                <td className="px-4 py-2.5">
                  <span
                    className={`px-2 py-0.5 text-xs capitalize rounded-full ${STATUS_STYLES[r.status] ?? "bg-gray-50 text-gray-700"}`}
                  >
                    {r.status}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex justify-end gap-1">
                    {r.status !== "approved" && (
                      <button
                        title="Approve"
                        disabled={statusMutation.isPending}
                        onClick={() =>
                          statusMutation.mutate({
                            id: r._id,
                            status: "approved",
                          })
                        }
                        className="p-1.5 rounded-lg text-gray-500 hover:text-green-600 hover:bg-green-50 transition-colors"
                      >
                        <Check size={14} />
                      </button>
                    )}
                    {r.status !== "hidden" && (
                      <button
                        title="Hide"
                        disabled={statusMutation.isPending}
                        onClick={() =>
                          statusMutation.mutate({ id: r._id, status: "hidden" })
                        }
                        className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                      >
                        <EyeOff size={14} />
                      </button>
                    )}
                    <button
                      title="Delete"
                      onClick={() => setDeleting(r)}
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

      {deleting && (
        <Modal title="Delete Review" onClose={() => setDeleting(null)}>
          <p className="text-sm text-gray-600">
            Are you sure you want to delete this review? This cannot be undone.
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
