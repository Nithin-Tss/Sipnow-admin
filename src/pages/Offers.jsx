import CrudPage from "../components/CrudPage";
import { offersStore as store } from "../lib/entityStores";

const fields = [
  { name: "title", label: "Offer title", required: true, colSpan: 2 },
  { name: "code", label: "Offer code" },
  {
    name: "discountType",
    label: "Discount type",
    type: "select",
    default: "percentage",
    options: [
      { value: "percentage", label: "Percentage" },
      { value: "fixed", label: "Fixed amount" },
    ],
  },
  {
    name: "discountValue",
    label: "Discount value",
    required: true,
    type: "number",
  },
  { name: "minimumPurchase", label: "Minimum purchase", type: "number" },
  { name: "maximumDiscount", label: "Maximum discount", type: "number" },
  { name: "startDate", label: "Start date", type: "date" },
  { name: "endDate", label: "End date", type: "date" },
  { name: "isActive", label: "Active", type: "checkbox", default: true },
  { name: "description", label: "Description", type: "textarea", colSpan: 2 },
];

const columns = [
  { key: "title", label: "Title" },
  { key: "code", label: "Code", render: (o) => o.code || "—" },
  {
    key: "discount",
    label: "Discount",
    render: (o) =>
      o.discountType === "percentage"
        ? `${o.discountValue}%`
        : `$${Number(o.discountValue || 0).toFixed(2)}`,
  },
  {
    key: "isActive",
    label: "Status",
    render: (o) => (
      <span
        className={`px-2 py-0.5 text-xs ${
          o.isActive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
        }`}
      >
        {o.isActive ? "Active" : "Inactive"}
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
      searchFields={["title", "code"]}
      searchPlaceholder="Search offers…"
    />
  );
}
