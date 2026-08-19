import CrudPage from "../components/CrudPage";
import { couponsStore as store } from "../lib/entityStores";

const fields = [
  { name: "code", label: "Coupon code", required: true, colSpan: 2 },
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
    type: "number",
    required: true,
  },
  { name: "expiresAt", label: "Expires on", type: "date", colSpan: 2 },
  { name: "active", label: "Active", type: "checkbox", default: true },
];

const columns = [
  { key: "code", label: "Code" },
  {
    key: "discount",
    label: "Discount",
    render: (c) =>
      c.discountType === "percentage"
        ? `${c.discountValue}%`
        : `$${Number(c.discountValue).toFixed(2)}`,
  },
  { key: "expiresAt", label: "Expires" },
  {
    key: "active",
    label: "Status",
    render: (c) => (
      <span
        className={`px-2 py-0.5 text-xs ${
          c.active ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
        }`}
      >
        {c.active ? "Active" : "Inactive"}
      </span>
    ),
  },
];

export default function Coupons() {
  return (
    <CrudPage
      title="Coupons"
      entityName="Coupon"
      store={store}
      queryKey="coupons"
      columns={columns}
      fields={fields}
      searchFields={["code"]}
      searchPlaceholder="Search coupons…"
    />
  );
}
