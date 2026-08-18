import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { api } from "../lib/api";
import { inputCls } from "../lib/ui";
import Modal from "../components/Modal";
import DeleteModalActions from "../components/DeleteModalActions";
import EmptyState from "../components/EmptyState";
import FormError from "../components/FormError";

const EMPTY_FORM = {
  name: "",
  line1: "",
  line2: "",
  city: "",
  county: "",
  postcode: "",
  phone: "",
  hours: "",
  lat: "",
  lng: "",
  rendrStoreId: "",
  isActive: true,
};

export default function Stores() {
  const queryClient = useQueryClient();

  const [modal, setModal] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErr, setFormErr] = useState("");

  const {
    data: stores = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["admin-stores"],
    queryFn: () => api.get("/stores?activeOnly=false"),
  });

  const saveMutation = useMutation({
    mutationFn: (data) =>
      data.mode === "add"
        ? api.post("/stores", data.body)
        : api.put(`/stores/${data.id}`, data.body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-stores"] });
      setModal(null);
    },
    onError: (err) => setFormErr(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/stores/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-stores"] });
      setModal(null);
    },
    onError: (err) => setFormErr(err.message),
  });

  function f(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function openAdd() {
    setForm(EMPTY_FORM);
    setFormErr("");
    setModal("add");
  }

  function openEdit(s) {
    setEditing(s);
    setForm({
      name: s.name,
      line1: s.line1,
      line2: s.line2 ?? "",
      city: s.city,
      county: s.county,
      postcode: s.postcode,
      phone: s.phone ?? "",
      hours: s.hours ?? "",
      lat: s.lat != null ? String(s.lat) : "",
      lng: s.lng != null ? String(s.lng) : "",
      rendrStoreId: s.rendrStoreId ?? "",
      isActive: s.isActive,
    });
    setFormErr("");
    setModal("edit");
  }

  function openDelete(s) {
    setEditing(s);
    setFormErr("");
    setModal("delete");
  }

  function save() {
    setFormErr("");
    if (!form.name.trim() || !form.line1.trim() || !form.city.trim()) {
      setFormErr("Name, address line 1, and city are required");
      return;
    }
    if (!form.county.trim() || !form.postcode.trim()) {
      setFormErr("State and postcode are required");
      return;
    }
    const body = {
      name: form.name.trim(),
      line1: form.line1.trim(),
      line2: form.line2.trim() || null,
      city: form.city.trim(),
      county: form.county.trim(),
      postcode: form.postcode.trim(),
      phone: form.phone.trim() || null,
      hours: form.hours.trim() || null,
      lat: form.lat.trim() ? Number.parseFloat(form.lat) : null,
      lng: form.lng.trim() ? Number.parseFloat(form.lng) : null,
      rendrStoreId: form.rendrStoreId.trim() || null,
      isActive: form.isActive,
    };
    saveMutation.mutate({
      mode: modal === "add" ? "add" : "edit",
      id: editing?.id,
      body,
    });
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Stores</h2>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 text-xs bg-primary text-white px-3 py-2"
        >
          <Plus size={13} /> Add Store
        </button>
      </div>

      {error && <p className="text-sm text-red-500 mb-4">{error.message}</p>}

      {isLoading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : stores.length === 0 ? (
        <EmptyState message="No stores yet. Add one to enable in-store pickup." />
      ) : (
        <div className="bg-white border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wider">
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Address</th>
                <th className="px-4 py-3 text-left">Phone</th>
                <th className="px-4 py-3 text-left">Rendr Store ID</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {stores.map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-gray-50 hover:bg-gray-50/50"
                >
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {s.name}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {s.line1}
                    {s.line2 ? `, ${s.line2}` : ""}, {s.city} {s.county}{" "}
                    {s.postcode}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{s.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                    {s.rendrStoreId ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="border border-gray-400 text-gray-800 px-2 py-0.5 text-xs uppercase tracking-wide">
                      {s.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => openEdit(s)}
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-primary px-2 py-1 hover:bg-primary/5"
                      >
                        <Pencil size={12} /> Edit
                      </button>
                      <button
                        onClick={() => openDelete(s)}
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 px-2 py-1 hover:bg-red-50"
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Modal */}
      {(modal === "add" || modal === "edit") && (
        <Modal
          title={modal === "add" ? "Add Store" : "Edit Store"}
          onClose={() => setModal(null)}
        >
          <div className="space-y-3">
            <FormError message={formErr} />

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Name *
              </label>
              <input
                className={inputCls}
                value={form.name}
                onChange={(e) => f("name", e.target.value)}
                placeholder="SipNow Wollert"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Address line 1 *
              </label>
              <input
                className={inputCls}
                value={form.line1}
                onChange={(e) => f("line1", e.target.value)}
                placeholder="1 Main Street"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Address line 2
              </label>
              <input
                className={inputCls}
                value={form.line2}
                onChange={(e) => f("line2", e.target.value)}
                placeholder="Optional"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  City *
                </label>
                <input
                  className={inputCls}
                  value={form.city}
                  onChange={(e) => f("city", e.target.value)}
                  placeholder="Wollert"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  State *
                </label>
                <input
                  className={inputCls}
                  value={form.county}
                  onChange={(e) => f("county", e.target.value)}
                  placeholder="VIC"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Postcode *
                </label>
                <input
                  className={inputCls}
                  value={form.postcode}
                  onChange={(e) => f("postcode", e.target.value)}
                  placeholder="3750"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Phone
                </label>
                <input
                  className={inputCls}
                  value={form.phone}
                  onChange={(e) => f("phone", e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Hours
                </label>
                <input
                  className={inputCls}
                  value={form.hours}
                  onChange={(e) => f("hours", e.target.value)}
                  placeholder="Mon-Fri 9am-6pm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Latitude
                </label>
                <input
                  type="number"
                  step="any"
                  className={inputCls}
                  value={form.lat}
                  onChange={(e) => f("lat", e.target.value)}
                  placeholder="Optional — for delivery routing"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Longitude
                </label>
                <input
                  type="number"
                  step="any"
                  className={inputCls}
                  value={form.lng}
                  onChange={(e) => f("lng", e.target.value)}
                  placeholder="Optional — for delivery routing"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Rendr store ID
              </label>
              <input
                className={`${inputCls} font-mono`}
                value={form.rendrStoreId}
                onChange={(e) => f("rendrStoreId", e.target.value)}
                placeholder="Optional — used to route home delivery through this store"
              />
              <p className="text-xs text-gray-400 mt-1">
                When set, this store is a candidate for Rendr's Store Allocation
                API when quoting home deliveries.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="storeActive"
                checked={form.isActive}
                onChange={(e) => f("isActive", e.target.checked)}
                className="w-4 h-4 accent-primary"
              />
              <label htmlFor="storeActive" className="text-sm text-gray-700">
                Active
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setModal(null)}
                className="text-sm text-gray-600 border border-gray-300 px-4 py-2 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saveMutation.isPending}
                className="text-sm bg-primary text-white px-4 py-2 disabled:opacity-60"
              >
                {saveMutation.isPending
                  ? "Saving…"
                  : modal === "add"
                    ? "Add Store"
                    : "Save Changes"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation */}
      {modal === "delete" && editing && (
        <Modal title="Delete Store" onClose={() => setModal(null)}>
          <p className="text-sm text-gray-600">
            Delete store{" "}
            <strong className="text-gray-900">{editing.name}</strong>? This
            cannot be undone. Orders that already picked up from this store keep
            their record; deletion will fail if any pickup orders still
            reference it.
          </p>
          <DeleteModalActions
            formErr={formErr}
            isPending={deleteMutation.isPending}
            onCancel={() => setModal(null)}
            onDelete={() => deleteMutation.mutate(editing.id)}
          />
        </Modal>
      )}
    </div>
  );
}
