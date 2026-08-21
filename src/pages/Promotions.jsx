import CrudPage from "../components/CrudPage";
import { promotionsStore as store } from "../lib/entityStores";

const fields = [
  { name: "title", label: "Promotion title", required: true, colSpan: 2 },
  {
    name: "discountType",
    label: "Discount type",
    type: "select",
    default: "percentage",
    options: [
      { value: "none", label: "None" },
      { value: "percentage", label: "Percentage" },
      { value: "fixed", label: "Fixed amount" },
    ],
  },
  { name: "discountValue", label: "Discount value", type: "number" },
  { name: "startDate", label: "Start date", type: "date" },
  { name: "endDate", label: "End date", type: "date" },
  { name: "isActive", label: "Active", type: "checkbox", default: true },
  { name: "description", label: "Description", type: "textarea", colSpan: 2 },
];

const columns = [
  { key: "title", label: "Title" },
  {
    key: "discount",
    label: "Discount",
    render: (p) =>
      p.discountType === "percentage"
        ? `${p.discountValue}%`
        : p.discountType === "fixed"
          ? `$${Number(p.discountValue || 0).toFixed(2)}`
          : "—",
  },
  {
    key: "period",
    label: "Period",
    render: (p) =>
      `${p.startDate ? new Date(p.startDate).toLocaleDateString() : "—"} → ${
        p.endDate ? new Date(p.endDate).toLocaleDateString() : "—"
      }`,
  },
  {
    key: "isActive",
    label: "Status",
    render: (p) => (
      <span
        className={`px-2 py-0.5 text-xs ${
          p.isActive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
        }`}
      >
        {p.isActive ? "Active" : "Inactive"}
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
