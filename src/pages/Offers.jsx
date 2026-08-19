import CrudPage from "../components/CrudPage";
import { offersStore as store } from "../lib/entityStores";

const fields = [
  { name: "title", label: "Offer title", required: true, colSpan: 2 },
  { name: "badgeText", label: "Badge text" },
  { name: "active", label: "Active", type: "checkbox", default: true },
  { name: "description", label: "Description", type: "textarea", colSpan: 2 },
];

const columns = [
  { key: "title", label: "Title" },
  { key: "badgeText", label: "Badge" },
  {
    key: "active",
    label: "Status",
    render: (o) => (
      <span
        className={`px-2 py-0.5 text-xs ${
          o.active ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
        }`}
      >
        {o.active ? "Active" : "Inactive"}
      </span>
    ),
  },
];

export default function Offers() {
  return (
    <CrudPage
      title="General Promotions"
      entityName="Offer"
      store={store}
      queryKey="offers"
      columns={columns}
      fields={fields}
      searchFields={["title", "badgeText"]}
      searchPlaceholder="Search offers…"
    />
  );
}
