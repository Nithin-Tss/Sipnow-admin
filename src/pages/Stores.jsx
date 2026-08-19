import CrudPage from "../components/CrudPage";
import { storesStore as store } from "../lib/entityStores";

const fields = [
  { name: "name", label: "Store name", required: true, colSpan: 2 },
  { name: "address", label: "Address", colSpan: 2 },
  { name: "city", label: "City" },
  { name: "phone", label: "Phone" },
  { name: "active", label: "Active", type: "checkbox", default: true },
];

const columns = [
  { key: "name", label: "Name" },
  { key: "city", label: "City" },
  { key: "phone", label: "Phone" },
  {
    key: "active",
    label: "Status",
    render: (s) => (
      <span
        className={`px-2 py-0.5 text-xs ${
          s.active ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
        }`}
      >
        {s.active ? "Open" : "Closed"}
      </span>
    ),
  },
];

export default function Stores() {
  return (
    <CrudPage
      title="Stores"
      entityName="Store"
      store={store}
      queryKey="stores"
      columns={columns}
      fields={fields}
      searchFields={["name", "city"]}
      searchPlaceholder="Search stores…"
    />
  );
}
