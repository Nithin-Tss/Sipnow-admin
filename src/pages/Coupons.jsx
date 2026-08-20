import CrudPage from "../components/CrudPage";
import { couponsStore as store } from "../lib/entityStores";

const fields = [
  {
    name: "code",
    label: "Coupon code",
    required: true,
    colSpan: 2,
  },

  {
    name: "discountType",
    label: "Discount type",
    type: "select",
    default: "percentage",
    options: [
      {
        value: "percentage",
        label: "Percentage",
      },
      {
        value: "fixed",
        label: "Fixed amount",
      },
    ],
  },

  {
    name: "discountValue",
    label: "Discount value",
    type: "number",
    required: true,
  },

  {
    name: "minPurchase",
    label: "Minimum purchase",
    type: "number",
    default: 0,
  },

  {
    name: "maxDiscount",
    label: "Maximum discount",
    type: "number",
  },

  {
    name: "expiresAt",
    label: "Expires on",
    type: "date",
    colSpan: 2,
  },

  {
    name: "usageLimit",
    label: "Usage limit",
    type: "number",
  },

  {
    name: "active",
    label: "Active",
    type: "checkbox",
    default: true,
  },
];

const columns = [
  {
    key: "code",
    label: "Code",
  },

  {
    key: "discount",
    label: "Discount",
    render: (coupon) =>
      coupon.discountType === "percentage"
        ? `${coupon.discountValue}%`
        : `$${Number(coupon.discountValue || 0).toFixed(2)}`,
  },

  {
    key: "minPurchase",
    label: "Min. Purchase",
    render: (coupon) =>
      `$${Number(coupon.minPurchase || 0).toFixed(2)}`,
  },

  {
    key: "expiresAt",
    label: "Expires",
    render: (coupon) =>
      coupon.expiresAt
        ? new Date(coupon.expiresAt).toLocaleDateString()
        : "No expiry",
  },

  {
    key: "usage",
    label: "Usage",
    render: (coupon) =>
      coupon.usageLimit === null ||
      coupon.usageLimit === undefined
        ? `${coupon.usedCount || 0} / Unlimited`
        : `${coupon.usedCount || 0} / ${coupon.usageLimit}`,
  },

  {
    key: "active",
    label: "Status",
    render: (coupon) => (
      <span
        className={`px-2 py-0.5 text-xs ${
          coupon.active
            ? "bg-green-50 text-green-700"
            : "bg-red-50 text-red-700"
        }`}
      >
        {coupon.active ? "Active" : "Inactive"}
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