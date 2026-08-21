import CrudPage from "../components/CrudPage";
import { storesStore as store } from "../lib/entityStores";

const fields = [
  { name: "name", label: "Store name", required: true, colSpan: 2 },
  { name: "addressLine1", label: "Address line 1", required: true, colSpan: 2 },
  { name: "addressLine2", label: "Address line 2", colSpan: 2 },
  { name: "city", label: "City", required: true },
  { name: "state", label: "State", required: true },
  { name: "postalCode", label: "Postal code", required: true },
  { name: "country", label: "Country", default: "India" },
  { name: "phone", label: "Phone" },
  { name: "email", label: "Email", type: "email" },
  {
    name: "deliveryRadiusKm",
    label: "Delivery radius (km)",
    type: "number",
    default: 0,
  },
  { name: "isActive", label: "Active", type: "checkbox", default: true },
];

const columns = [
  { key: "name", label: "Name" },
  { key: "city", label: "City" },
  { key: "phone", label: "Phone" },
  {
    key: "isActive",
    label: "Status",
    render: (s) => (
      <span
        className={`px-2 py-0.5 text-xs ${
          s.isActive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
        }`}
      >
        {s.isActive ? "Open" : "Closed"}
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
