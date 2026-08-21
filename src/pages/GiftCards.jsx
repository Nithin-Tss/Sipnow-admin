import CrudPage from "../components/CrudPage";
import { giftCardsStore as store } from "../lib/entityStores";

const fields = [
  { name: "amount", label: "Amount", type: "number", required: true },
  { name: "recipientName", label: "Recipient name", required: true },
  {
    name: "recipientEmail",
    label: "Recipient email",
    type: "email",
    required: true,
    colSpan: 2,
  },
  { name: "expiryDate", label: "Expiry date", type: "date" },
  { name: "isActive", label: "Active", type: "checkbox", default: true },
  { name: "message", label: "Message", type: "textarea", colSpan: 2 },
];

const columns = [
  { key: "code", label: "Code" },
  {
    key: "amount",
    label: "Amount",
    render: (g) => `$${Number(g.amount).toFixed(2)}`,
  },
  {
    key: "balance",
    label: "Balance",
    render: (g) => `$${Number(g.balance).toFixed(2)}`,
  },
  { key: "recipientName", label: "Recipient" },
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
      searchFields={["code", "recipientName", "recipientEmail"]}
      searchPlaceholder="Search gift cards…"
    />
  );
}
