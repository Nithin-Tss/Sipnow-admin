import CrudPage from "../components/CrudPage";
import { promotionsStore as store } from "../lib/entityStores";

const fields = [
  { name: "title", label: "Promotion title", required: true, colSpan: 2 },
  {
    name: "discountPercent",
    label: "Discount %",
    type: "number",
    required: true,
  },
  { name: "startDate", label: "Start date", type: "date" },
  { name: "endDate", label: "End date", type: "date" },
  { name: "active", label: "Active", type: "checkbox", default: true },
];

const columns = [
  { key: "title", label: "Title" },
  {
    key: "discountPercent",
    label: "Discount",
    render: (p) => `${p.discountPercent}%`,
  },
  {
    key: "period",
    label: "Period",
    render: (p) => `${p.startDate || "—"} → ${p.endDate || "—"}`,
  },
  {
    key: "active",
    label: "Status",
    render: (p) => (
      <span
        className={`px-2 py-0.5 text-xs ${
          p.active ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
        }`}
      >
        {p.active ? "Active" : "Inactive"}
      </span>
    ),
  },
];

export default function Promotions() {
  return (
    <CrudPage
      title="Promotions"
      entityName="Promotion"
      store={store}
      queryKey="promotions"
      columns={columns}
      fields={fields}
      searchFields={["title"]}
      searchPlaceholder="Search promotions…"
    />
  );
}
