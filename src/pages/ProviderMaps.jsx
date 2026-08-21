import CrudPage from "../components/CrudPage";
import { suppliersStore as store } from "../lib/entityStores";

const fields = [
  { name: "name", label: "Supplier name", required: true, colSpan: 2 },
  { name: "contactEmail", label: "Contact email", type: "email", colSpan: 2 },
  { name: "phone", label: "Phone" },
  { name: "region", label: "Region" },
  { name: "isActive", label: "Active", type: "checkbox", default: true },
];

const columns = [
  { key: "name", label: "Name" },
  { key: "contactEmail", label: "Contact" },
  { key: "phone", label: "Phone" },
  { key: "region", label: "Region" },
  {
    key: "isActive",
    label: "Status",
    render: (s) => (
      <span
        className={`px-2 py-0.5 text-xs ${
          s.isActive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
        }`}
      >
        {s.isActive ? "Active" : "Inactive"}
      </span>
    ),
  },
];

export default function ProviderMaps() {
  return (
    <CrudPage
      title="Suppliers"
      entityName="Supplier"
      store={store}
      queryKey="suppliers"
      columns={columns}
      fields={fields}
      searchFields={["name", "region"]}
      searchPlaceholder="Search suppliers…"
    />
  );
}
