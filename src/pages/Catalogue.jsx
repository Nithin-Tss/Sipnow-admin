import CrudPage from "../components/CrudPage";
import { categoriesStore as store } from "../lib/entityStores";

const fields = [
  { name: "name", label: "Category name", required: true, colSpan: 2 },
  { name: "image", label: "Image URL", colSpan: 2 },
  { name: "isActive", label: "Active", type: "checkbox", default: true },
  { name: "description", label: "Description", type: "textarea", colSpan: 2 },
];

const columns = [
  { key: "name", label: "Name" },
  { key: "description", label: "Description" },
  {
    key: "isActive",
    label: "Status",
    render: (c) => (
      <span
        className={`px-2 py-0.5 text-xs ${
          c.isActive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
        }`}
      >
        {c.isActive ? "Active" : "Inactive"}
      </span>
    ),
  },
];

export default function Catalogue() {
  return (
    <CrudPage
      title="Catalogue"
      entityName="Category"
      store={store}
      queryKey="categories"
      columns={columns}
      fields={fields}
      searchFields={["name"]}
      searchPlaceholder="Search categories…"
    />
  );
}
