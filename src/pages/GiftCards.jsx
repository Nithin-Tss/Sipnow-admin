import CrudPage from "../components/CrudPage";
import { giftCardsStore as store } from "../lib/entityStores";

const fields = [
  { name: "code", label: "Gift card code", required: true, colSpan: 2 },
  {
    name: "initialValue",
    label: "Initial value",
    type: "number",
    required: true,
  },
  { name: "balance", label: "Current balance", type: "number", required: true },
  { name: "active", label: "Active", type: "checkbox", default: true },
];

const columns = [
  { key: "code", label: "Code" },
  {
    key: "initialValue",
    label: "Initial",
    render: (g) => `$${Number(g.initialValue).toFixed(2)}`,
  },
  {
    key: "balance",
    label: "Balance",
    render: (g) => `$${Number(g.balance).toFixed(2)}`,
  },
  {
    key: "active",
    label: "Status",
    render: (g) => (
      <span
        className={`px-2 py-0.5 text-xs ${
          g.active ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
        }`}
      >
        {g.active ? "Active" : "Inactive"}
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
      searchFields={["code"]}
      searchPlaceholder="Search gift cards…"
    />
  );
}
