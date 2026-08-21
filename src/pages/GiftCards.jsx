import CrudPage from "../components/CrudPage";
import { giftCardsStore as store } from "../lib/entityStores";

const fields = [
  {
    name: "recipientName",
    label: "Recipient name",
    required: true,
    colSpan: 2,
  },
  {
    name: "recipientEmail",
    label: "Recipient email",
    type: "email",
    required: true,
    colSpan: 2,
  },
  {
    name: "amount",
    label: "Amount (used on create only)",
    type: "number",
    required: true,
  },
  { name: "expiryDate", label: "Expiry date", type: "date" },
  { name: "message", label: "Gift message", type: "textarea", colSpan: 2 },
  { name: "isActive", label: "Active", type: "checkbox", default: true },
];

const columns = [
  { key: "code", label: "Code" },
  { key: "recipientName", label: "Recipient" },
  {
    key: "amount",
    label: "Amount",
    render: (g) => `$${Number(g.amount || 0).toFixed(2)}`,
  },
  {
    key: "balance",
    label: "Balance",
    render: (g) => `$${Number(g.balance || 0).toFixed(2)}`,
  },
  {
    key: "isRedeemed",
    label: "Redeemed",
    render: (g) => (g.isRedeemed ? "Yes" : "No"),
  },
  {
    key: "isActive",
    label: "Status",
    render: (g) => (
      <span
        className={`px-2 py-0.5 text-xs ${
          g.isActive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
        }`}
      >
        {g.isActive ? "Active" : "Inactive"}
      </span>
    ),
  },
];

export default function GiftCards() {
  return (
    <CrudPage
      title="Gift Cards"
      entityName="Gift Card"
      store={store}
      queryKey="gift-cards"
      columns={columns}
      fields={fields}
      searchFields={["code", "recipientName"]}
      searchPlaceholder="Search gift cards…"
    />
  );
}
