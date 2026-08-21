import CrudPage from "../components/CrudPage";
import { promotionsStore as store } from "../lib/entityStores";

const fields = [
  { name: "title", label: "Promotion title", required: true, colSpan: 2 },
  { name: "description", label: "Description", type: "textarea", colSpan: 2 },
  {
    name: "type",
    label: "Type",
    type: "select",
    default: "general",
    options: [
      { value: "general", label: "General" },
      { value: "product", label: "Product" },
      { value: "category", label: "Category" },
      { value: "brand", label: "Brand" },
      { value: "seasonal", label: "Seasonal" },
      { value: "member", label: "Member" },
      { value: "clearance", label: "Clearance" },
    ],
  },
  {
    name: "discountType",
    label: "Discount type",
    type: "select",
    default: "none",
    options: [
      { value: "none", label: "None" },
      { value: "percentage", label: "Percentage" },
      { value: "fixed", label: "Fixed amount" },
    ],
  },
  { name: "discountValue", label: "Discount value", type: "number" },
  { name: "priority", label: "Priority", type: "number" },
  { name: "startDate", label: "Start date", type: "date" },
  { name: "endDate", label: "End date", type: "date" },
  { name: "image", label: "Image URL", colSpan: 2 },
  { name: "isActive", label: "Active", type: "checkbox", default: true },
];

function discountLabel(p) {
  if (!p.discountType || p.discountType === "none") return "—";
  return p.discountType === "percentage"
    ? `${p.discountValue}%`
    : `$${Number(p.discountValue || 0).toFixed(2)}`;
}

const columns = [
  { key: "title", label: "Title" },
  {
    key: "type",
    label: "Type",
    render: (p) => <span className="capitalize">{p.type}</span>,
  },
  {
    key: "discount",
    label: "Discount",
    render: discountLabel,
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
