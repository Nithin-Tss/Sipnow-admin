import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { inputCls } from "../lib/ui";
import SearchInput from "./SearchInput";
import PaginationBar from "./PaginationBar";
import TableStateRow from "./TableStateRow";
import Modal from "./Modal";
import FormError from "./FormError";
import DeleteModalActions from "./DeleteModalActions";

const PER_PAGE = 20;

function emptyFormFrom(fields) {
  const form = {};
  for (const field of fields) {
    form[field.name] =
      field.default ?? (field.type === "checkbox" ? false : "");
  }
  return form;
}

function formToBody(editing, fields) {
  const body = {};
  for (const field of fields) {
    const value = editing[field.name];
    if (field.type === "number") body[field.name] = Number(value) || 0;
    else if (field.type === "checkbox") body[field.name] = Boolean(value);
    else body[field.name] = typeof value === "string" ? value.trim() : value;
  }
  return body;
}

export default function CrudPage({
  title,
  entityName,
  store,
  columns,
  fields,
  searchFields,
  searchPlaceholder = "Search…",
  queryKey,
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: [queryKey, search, page],
    queryFn: () =>
      store.list({ search, page, perPage: PER_PAGE, searchFields }),
    placeholderData: (prev) => prev,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: [queryKey] });
  }

  const saveMutation = useMutation({
    mutationFn: (payload) =>
      payload.id
        ? store.update(payload.id, payload.body)
        : store.create(payload.body),
    onSuccess: () => {
      invalidate();
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => store.remove(id),
    onSuccess: () => {
      invalidate();
      setDeleting(null);
    },
  });

  function openCreate() {
    saveMutation.reset();
    setEditing({ isNew: true, ...emptyFormFrom(fields) });
  }

  function openEdit(item) {
    saveMutation.reset();
    const form = { isNew: false, id: item._id };
    for (const field of fields) {
      const value = item[field.name];
      form[field.name] =
        field.type === "checkbox" ? Boolean(value) : (value ?? "");
    }
    setEditing(form);
  }

  function handleSubmit(e) {
    e.preventDefault();
    const body = formToBody(editing, fields);
    saveMutation.mutate({ id: editing.isNew ? null : editing.id, body });
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 bg-primary text-white text-sm px-4 py-2 hover:opacity-90"
        >
          <Plus size={14} /> Add {entityName}
        </button>
      </div>

      <div className="mt-4 max-w-sm">
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder={searchPlaceholder}
        />
      </div>

      <div className="mt-4 bg-white border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-2.5 font-medium ${col.align === "right" ? "text-right" : ""}`}
                >
                  {col.label}
                </th>
              ))}
              <th className="px-4 py-2.5 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading && (
              <TableStateRow colSpan={columns.length + 1}>
                Loading…
              </TableStateRow>
            )}
            {isError && (
              <TableStateRow colSpan={columns.length + 1}>
                Failed to load: {error.message}
              </TableStateRow>
            )}
            {!isLoading && !isError && items.length === 0 && (
              <TableStateRow colSpan={columns.length + 1}>
                No {entityName.toLowerCase()}s found.
              </TableStateRow>
            )}
            {items.map((item) => (
              <tr key={item._id} className="hover:bg-gray-50">
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-2.5 text-gray-600 ${col.align === "right" ? "text-right" : ""}`}
                  >
                    {col.render ? col.render(item) : item[col.key]}
                  </td>
                ))}
                <td className="px-4 py-2.5">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => openEdit(item)}
                      className="p-1.5 text-gray-500 hover:text-primary"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setDeleting(item)}
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
          title={editing.isNew ? `Add ${entityName}` : `Edit ${entityName}`}
          onClose={() => setEditing(null)}
        >
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {fields.map((field) => {
                const colClass = field.colSpan === 2 ? "col-span-2" : "";
                if (field.type === "select") {
                  return (
                    <select
                      key={field.name}
                      className={`${inputCls} ${colClass}`}
                      value={editing[field.name]}
                      onChange={(e) =>
                        setEditing({ ...editing, [field.name]: e.target.value })
                      }
                    >
                      {field.options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  );
                }
                if (field.type === "checkbox") {
                  return (
                    <label
                      key={field.name}
                      className="col-span-2 flex items-center gap-2 text-sm text-gray-700"
                    >
                      <input
                        type="checkbox"
                        checked={editing[field.name]}
                        onChange={(e) =>
                          setEditing({
                            ...editing,
                            [field.name]: e.target.checked,
                          })
                        }
                      />
                      {field.label}
                    </label>
                  );
                }
                if (field.type === "textarea") {
                  return (
                    <textarea
                      key={field.name}
                      placeholder={field.label}
                      className={`${inputCls} ${colClass}`}
                      rows={3}
                      value={editing[field.name]}
                      onChange={(e) =>
                        setEditing({ ...editing, [field.name]: e.target.value })
                      }
                    />
                  );
                }
                return (
                  <input
                    key={field.name}
                    required={field.required}
                    type={field.type ?? "text"}
                    step={field.type === "number" ? "0.01" : undefined}
                    min={field.type === "number" ? "0" : undefined}
                    placeholder={field.label}
                    className={`${inputCls} ${colClass}`}
                    value={editing[field.name]}
                    onChange={(e) =>
                      setEditing({ ...editing, [field.name]: e.target.value })
                    }
                  />
                );
              })}
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
        <Modal title={`Delete ${entityName}`} onClose={() => setDeleting(null)}>
          <p className="text-sm text-gray-600">
            Are you sure you want to delete{" "}
            <strong>
              {deleting.name ??
                deleting.title ??
                deleting.code ??
                deleting.customerName ??
                deleting.productName ??
                deleting.subject}
            </strong>
            ? This cannot be undone.
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
