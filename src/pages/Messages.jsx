import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { messagesStore as store } from "../lib/entityStores";
import { inputCls } from "../lib/ui";
import SearchInput from "../components/SearchInput";
import PaginationBar from "../components/PaginationBar";
import TableStateRow from "../components/TableStateRow";
import Modal from "../components/Modal";
import DeleteModalActions from "../components/DeleteModalActions";

const PER_PAGE = 20;

const STATUS_STYLES = {
  pending: "bg-blue-50 text-blue-700",
  "in-progress": "bg-yellow-50 text-yellow-700",
  resolved: "bg-green-50 text-green-700",
};

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "in-progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
];

const FILTER_OPTIONS = [
  { value: "", label: "All statuses" },
  ...STATUS_OPTIONS,
];

export default function Messages() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["messages", search, status, page],
    queryFn: () => store.list({ search, status, page, perPage: PER_PAGE }),
    placeholderData: (prev) => prev,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["messages"] });
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
      <h2 className="text-xl font-semibold text-gray-900">Messages</h2>
      <p className="mt-1 text-xs text-gray-500">
        Contact form submissions. Update status or delete — there is no admin
        create.
      </p>

      <div className="mt-4 flex items-center gap-3 max-w-2xl">
        <div className="max-w-sm flex-1">
          <SearchInput
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Search by name or subject…"
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
          {FILTER_OPTIONS.map((opt) => (
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
              <th className="px-4 py-2.5 font-medium">From</th>
              <th className="px-4 py-2.5 font-medium">Subject</th>
              <th className="px-4 py-2.5 font-medium">Message</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading && <TableStateRow colSpan={5}>Loading…</TableStateRow>}
            {isError && (
              <TableStateRow colSpan={5}>
                Failed to load messages: {error.message}
              </TableStateRow>
            )}
            {!isLoading && !isError && items.length === 0 && (
              <TableStateRow colSpan={5}>No messages found.</TableStateRow>
            )}
            {items.map((m) => (
              <tr key={m._id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-2.5 text-gray-900">
                  <div>{m.name}</div>
                  <div className="text-xs text-gray-400">{m.email}</div>
                </td>
                <td className="px-4 py-2.5 text-gray-600">
                  {m.subject || "—"}
                </td>
                <td
                  className="px-4 py-2.5 text-gray-600 max-w-xs truncate cursor-pointer"
                  onClick={() => setViewing(m)}
                  title="Click to view full message"
                >
                  {m.message}
                </td>
                <td className="px-4 py-2.5">
                  <select
                    className={`${inputCls} text-xs ${STATUS_STYLES[m.status] ?? ""}`}
                    value={m.status}
                    disabled={statusMutation.isPending}
                    onChange={(e) =>
                      statusMutation.mutate({
                        id: m._id,
                        status: e.target.value,
                      })
                    }
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex justify-end gap-1">
                    <button
                      title="Delete"
                      onClick={() => setDeleting(m)}
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

      {viewing && (
        <Modal title="Message" onClose={() => setViewing(null)}>
          <div className="space-y-2 text-sm">
            <p>
              <strong>From:</strong> {viewing.name} ({viewing.email})
            </p>
            {viewing.phone && (
              <p>
                <strong>Phone:</strong> {viewing.phone}
              </p>
            )}
            <p>
              <strong>Subject:</strong> {viewing.subject || "—"}
            </p>
            <p className="whitespace-pre-wrap text-gray-700 border-t border-gray-100 pt-2">
              {viewing.message}
            </p>
          </div>
        </Modal>
      )}

      {deleting && (
        <Modal title="Delete Message" onClose={() => setDeleting(null)}>
          <p className="text-sm text-gray-600">
            Are you sure you want to delete this message? This cannot be undone.
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
