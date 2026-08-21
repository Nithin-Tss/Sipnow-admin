import { useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";

import {
  fetchBrands,
  createBrand,
  updateBrand,
  deleteBrand,
  verifyBrand,
} from "../lib/brandsApi";

import { inputCls } from "../lib/ui";
import SearchInput from "../components/SearchInput";
import PaginationBar from "../components/PaginationBar";
import TableStateRow from "../components/TableStateRow";
import Modal from "../components/Modal";
import FormError from "../components/FormError";
import DeleteModalActions from "../components/DeleteModalActions";
import { useAuth } from "../context/AuthContext";

const EMPTY_FORM = {
  name: "",
  description: "",
  logo: "",
  bannerImage: "",
  bestSellingDescription: "",
  bestRatedDescription: "",
  collectionDescription: "",
  isActive: true,
  verified: false,
  verificationEmail: "",
};

const BRAND_FORM_SECTIONS = [
  {
    title: "Brand Details",
    fields: [
      {
        key: "name",
        label: "Brand Name",
        required: true,
      },
      {
        key: "description",
        label: "Description",
        type: "textarea",
        span: 2,
      },
    ],
  },
  {
    title: "Brand Images",
    fields: [
      {
        key: "logo",
        label: "Logo Image URL",
        placeholder: "https://...",
        span: 2,
      },
      {
        key: "bannerImage",
        label: "Brand Banner Image URL",
        placeholder: "https://...",
        span: 2,
      },
    ],
  },
  {
    title: "Frontend Brand Page",
    fields: [
      {
        key: "bestSellingDescription",
        label: "Best Selling Section Description",
        type: "textarea",
        span: 2,
      },
      {
        key: "bestRatedDescription",
        label: "Best Rated Section Description",
        type: "textarea",
        span: 2,
      },
      {
        key: "collectionDescription",
        label: "Collection Section Description",
        type: "textarea",
        span: 2,
      },
    ],
  },
  {
    title: "Status",
    fields: [
      {
        key: "isActive",
        label: "Active",
        type: "checkbox",
      },
    ],
  },
];

const PER_PAGE = 20;

export default function Brands() {
  const { user } = useAuth();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["brands", search, page],
    queryFn: () =>
      fetchBrands({
        search,
        page,
        perPage: PER_PAGE,
      }),
    placeholderData: (prev) => prev,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  function invalidate() {
    queryClient.invalidateQueries({
      queryKey: ["brands"],
    });
  }

  const saveMutation = useMutation({
    mutationFn: (payload) =>
      payload.id
        ? updateBrand(payload.id, payload.body)
        : createBrand(payload.body),

    onSuccess: () => {
      invalidate();
      setEditing(null);
    },
  });

  /*
   * Brand verification mutation.
   * This follows the same pattern as the Products page.
   */
  const verifyMutation = useMutation({
    mutationFn: ({ id, verified }) => verifyBrand(id, verified),

    onSuccess: (updated) => {
      invalidate();

      setEditing((cur) =>
        cur && !cur.isNew && cur.id === updated._id
          ? {
              ...cur,
              verified: updated.verified,
              verificationEmail: updated.verificationEmail,
            }
          : cur
      );
    },
  });

  function toggleVerified(brand) {
    verifyMutation.mutate({
      id: brand._id,
      verified: !brand.verified,
    });
  }

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteBrand(id),

    onSuccess: () => {
      invalidate();
      setDeleting(null);
    },
  });

  function openCreate() {
    saveMutation.reset();
    verifyMutation.reset();

    setEditing({
      isNew: true,
      ...EMPTY_FORM,
    });
  }

  function openEdit(brand) {
    saveMutation.reset();
    verifyMutation.reset();

    setEditing({
      ...EMPTY_FORM,
      ...brand,
      id: brand._id,
      isNew: false,
      isActive: Boolean(brand.isActive),
      verified: Boolean(brand.verified),
      verificationEmail: brand.verificationEmail || "",
    });
  }

  function handleSubmit(e) {
    e.preventDefault();

    const body = {
      name: editing.name.trim(),
      description: editing.description.trim(),
      logo: editing.logo.trim(),
      bannerImage: editing.bannerImage.trim(),
      bestSellingDescription: editing.bestSellingDescription.trim(),
      bestRatedDescription: editing.bestRatedDescription.trim(),
      collectionDescription: editing.collectionDescription.trim(),
      isActive: editing.isActive,
      verified: editing.verified,
      verificationEmail: editing.verified
        ? editing.verificationEmail || user?.email || ""
        : "",
    };

    saveMutation.mutate({
      id: editing.isNew ? null : editing.id,
      body,
    });
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Brands</h2>

        <div className="flex items-center gap-2">
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 rounded-lg bg-primary text-white text-sm px-4 py-2 hover:opacity-90 transition-opacity shadow-sm"
          >
            <Plus size={14} />
            Add Brand
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mt-4 max-w-sm">
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Search brands…"
        />
      </div>

      {/* Brand Table */}
      <div className="mt-4 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/60 text-left text-xs text-gray-500">
              <th className="px-4 py-2.5 font-medium">
                Brand Name
              </th>

              <th className="px-4 py-2.5 font-medium">
                Description
              </th>

              <th className="px-4 py-2.5 font-medium">
                Status
              </th>

              <th className="px-4 py-2.5 font-medium">
                Verification
              </th>

              <th className="px-4 py-2.5 font-medium text-right">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {isLoading && (
              <TableStateRow colSpan={5}>
                Loading…
              </TableStateRow>
            )}

            {isError && (
              <TableStateRow colSpan={5}>
                Failed to load brands: {error.message}
              </TableStateRow>
            )}

            {!isLoading && !isError && items.length === 0 && (
              <TableStateRow colSpan={5}>
                No brands found.
              </TableStateRow>
            )}

            {items.map((brand) => (
              <tr
                key={brand._id}
                className="hover:bg-gray-50 transition-colors"
              >
                <td className="px-4 py-2.5 text-gray-900">
                  {brand.name}
                </td>

                <td className="px-4 py-2.5 text-gray-600">
                  {brand.description}
                </td>

                <td className="px-4 py-2.5">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      brand.isActive
                        ? "bg-green-50 text-green-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {brand.isActive ? "Active" : "Inactive"}
                  </span>
                </td>

                {/* Verification */}
                <td className="px-4 py-2.5">
                  <label
                    className="flex items-center gap-1.5 text-xs cursor-pointer"
                    title={
                      brand.verified
                        ? `Verified by ${
                            brand.verificationEmail || "Admin"
                          }`
                        : `Click to verify as ${
                            user?.email || "Admin"
                          }`
                    }
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(brand.verified)}
                      disabled={verifyMutation.isPending}
                      onChange={() => toggleVerified(brand)}
                    />

                    <span
                      className={
                        brand.verified
                          ? "text-green-700"
                          : "text-gray-500"
                      }
                    >
                      {brand.verified
                        ? "Verified"
                        : "Unverified"}
                    </span>
                  </label>
                </td>

                {/* Actions */}
                <td className="px-4 py-2.5">
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() => openEdit(brand)}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-primary hover:bg-primary/10 transition-colors"
                    >
                      <Pencil size={14} />
                    </button>

                    <button
                      onClick={() => setDeleting(brand)}
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

      {/* Add / Edit Brand Modal */}
      {editing && (
        <Modal
          title={editing.isNew ? "Add Brand" : "Edit Brand"}
          size="2xl"
          onClose={() => setEditing(null)}
          footer={
            <div className="space-y-2">
              <FormError message={saveMutation.error?.message} />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="text-sm rounded-lg text-gray-600 border border-gray-300 px-4 py-2 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  form="brand-form"
                  disabled={saveMutation.isPending}
                  className="text-sm rounded-lg bg-primary text-white px-4 py-2 hover:opacity-90 disabled:opacity-60 transition-opacity shadow-sm"
                >
                  {saveMutation.isPending
                    ? "Saving…"
                    : "Save"}
                </button>
              </div>
            </div>
          }
        >
          <form
            id="brand-form"
            onSubmit={handleSubmit}
            className="space-y-3"
          >
            {/* Verification */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                Verification
              </h4>

              <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5">
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editing.verified}
                    disabled={
                      !editing.isNew &&
                      verifyMutation.isPending
                    }
                    onChange={(e) => {
                      const checked = e.target.checked;

                      if (editing.isNew) {
                        setEditing({
                          ...editing,
                          verified: checked,
                          verificationEmail: checked
                            ? user?.email || ""
                            : "",
                        });
                      } else {
                        verifyMutation.mutate({
                          id: editing.id,
                          verified: checked,
                        });
                      }
                    }}
                  />

                  <span className="font-medium">
                    Verified
                  </span>

                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      editing.verified
                        ? "bg-green-50 text-green-700"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {editing.verified
                      ? "Verified"
                      : "Unverified"}
                  </span>
                </label>

                <p className="mt-1 pl-6 text-xs text-gray-500">
                  {editing.verified
                    ? `Verified by ${
                        editing.verificationEmail ||
                        user?.email ||
                        ""
                      }`
                    : `Will be recorded as verified by ${
                        user?.email || ""
                      }`}
                </p>
              </div>
            </div>

            {/* Brand Form Sections */}
            {BRAND_FORM_SECTIONS.map((section) => (
              <div key={section.title}>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                  {section.title}
                </h4>

                <div className="grid grid-cols-2 gap-2">
                  {section.fields.map((field) => (
                    <label
                      key={field.key}
                      className={`text-xs text-gray-500 space-y-0.5 ${
                        field.span === 2
                          ? "col-span-2"
                          : ""
                      } ${
                        field.type === "checkbox"
                          ? "flex items-center gap-2 text-sm text-gray-700 pt-3.5"
                          : ""
                      }`}
                    >
                      {field.type === "checkbox" ? (
                        <>
                          <input
                            type="checkbox"
                            checked={editing[field.key]}
                            onChange={(e) =>
                              setEditing({
                                ...editing,
                                [field.key]:
                                  e.target.checked,
                              })
                            }
                          />

                          {field.label}
                        </>
                      ) : (
                        <>
                          <span>
                            {field.label}

                            {field.required && (
                              <span className="text-primary">
                                {" "}
                                *
                              </span>
                            )}
                          </span>

                          {field.type === "textarea" ? (
                            <textarea
                              rows={3}
                              placeholder={field.placeholder}
                              className={inputCls}
                              value={editing[field.key]}
                              onChange={(e) =>
                                setEditing({
                                  ...editing,
                                  [field.key]:
                                    e.target.value,
                                })
                              }
                            />
                          ) : (
                            <input
                              required={field.required}
                              type="text"
                              placeholder={field.placeholder}
                              className={inputCls}
                              value={editing[field.key]}
                              onChange={(e) =>
                                setEditing({
                                  ...editing,
                                  [field.key]:
                                    e.target.value,
                                })
                              }
                            />
                          )}
                        </>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </form>
        </Modal>
      )}

      {/* Delete Brand Modal */}
      {deleting && (
        <Modal
          title="Delete Brand"
          onClose={() => setDeleting(null)}
        >
          <p className="text-sm text-gray-600">
            Are you sure you want to delete{" "}
            <strong>{deleting.name}</strong>? This cannot be
            undone.
          </p>

          <DeleteModalActions
            formErr={deleteMutation.error?.message}
            isPending={deleteMutation.isPending}
            onCancel={() => setDeleting(null)}
            onDelete={() =>
              deleteMutation.mutate(deleting._id)
            }
          />
        </Modal>
      )}
    </div>
  );
}