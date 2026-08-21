import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { usersStore as store } from "../lib/entityStores";
import { inputCls } from "../lib/ui";
import SearchInput from "../components/SearchInput";
import PaginationBar from "../components/PaginationBar";
import TableStateRow from "../components/TableStateRow";
import Modal from "../components/Modal";
import DeleteModalActions from "../components/DeleteModalActions";

const PER_PAGE = 20;

const ROLE_OPTIONS = [
  { value: "customer", label: "Customer" },
  { value: "admin", label: "Admin" },
];

export default function Users() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState(null);

  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["users", search, page],
    queryFn: () => store.list({ search, page, perPage: PER_PAGE }),
    placeholderData: (prev) => prev,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["users"] });
  }

  const roleMutation = useMutation({
    mutationFn: ({ id, role }) => store.updateRole(id, role),
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Users</h2>
          <p className="mt-1 text-xs text-gray-500">
            The backend only supports changing a user's role or deleting an
            account — there is no admin create/edit-profile endpoint.
          </p>
        </div>
      </div>

      <div className="mt-4 max-w-sm">
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Search users…"
        />
      </div>

      <div className="mt-4 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/60 text-left text-xs text-gray-500">
              <th className="px-4 py-2.5 font-medium">Name</th>
              <th className="px-4 py-2.5 font-medium">Email</th>
              <th className="px-4 py-2.5 font-medium">Phone</th>
              <th className="px-4 py-2.5 font-medium">Role</th>
              <th className="px-4 py-2.5 font-medium">Joined</th>
              <th className="px-4 py-2.5 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading && <TableStateRow colSpan={6}>Loading…</TableStateRow>}
            {isError && (
              <TableStateRow colSpan={6}>
                Failed to load users: {error.message}
              </TableStateRow>
            )}
            {!isLoading && !isError && items.length === 0 && (
              <TableStateRow colSpan={6}>No users found.</TableStateRow>
            )}
            {items.map((u) => (
              <tr key={u._id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-2.5 text-gray-900">{u.name}</td>
                <td className="px-4 py-2.5 text-gray-600">{u.email}</td>
                <td className="px-4 py-2.5 text-gray-600">{u.phone || "—"}</td>
                <td className="px-4 py-2.5">
                  <select
                    className={inputCls}
                    value={u.role}
                    disabled={roleMutation.isPending}
                    onChange={(e) =>
                      roleMutation.mutate({ id: u._id, role: e.target.value })
                    }
                  >
                    {ROLE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2.5 text-gray-600">
                  {u.createdAt
                    ? new Date(u.createdAt).toLocaleDateString()
                    : "—"}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() => setDeleting(u)}
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
        <Modal title="Delete User" onClose={() => setDeleting(null)}>
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
