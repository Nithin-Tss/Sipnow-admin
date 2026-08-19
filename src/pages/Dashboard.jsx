import { useQuery } from "@tanstack/react-query";
import {
  Package,
  ShoppingBag,
  Users,
  MessageSquare,
  Star,
  Ticket,
} from "lucide-react";
import { fetchAllProducts } from "../lib/mockProducts";
import {
  ordersStore,
  usersStore,
  reviewsStore,
  messagesStore,
  couponsStore,
} from "../lib/entityStores";

function useAllOf(store, key) {
  return useQuery({ queryKey: [key], queryFn: () => store.all() });
}

export default function Dashboard() {
  const products = useQuery({
    queryKey: ["dashboard-products"],
    queryFn: fetchAllProducts,
  });
  const orders = useAllOf(ordersStore, "dashboard-orders");
  const users = useAllOf(usersStore, "dashboard-users");
  const reviews = useAllOf(reviewsStore, "dashboard-reviews");
  const messages = useAllOf(messagesStore, "dashboard-messages");
  const coupons = useAllOf(couponsStore, "dashboard-coupons");

  const revenue = (orders.data ?? [])
    .filter((o) => o.status !== "cancelled")
    .reduce((sum, o) => sum + Number(o.total || 0), 0);

  const unreadMessages = (messages.data ?? []).filter(
    (m) => m.status === "unread",
  ).length;

  const pendingReviews = (reviews.data ?? []).filter(
    (r) => r.status === "pending",
  ).length;

  const activeCoupons = (coupons.data ?? []).filter((c) => c.active).length;

  const cards = [
    {
      label: "Products",
      value: products.data?.length ?? "…",
      icon: Package,
    },
    {
      label: "Orders",
      value: orders.data?.length ?? "…",
      sub: `$${revenue.toFixed(2)} revenue`,
      icon: ShoppingBag,
    },
    {
      label: "Users",
      value: users.data?.length ?? "…",
      icon: Users,
    },
    {
      label: "Unread Messages",
      value: unreadMessages,
      icon: MessageSquare,
    },
    {
      label: "Pending Reviews",
      value: pendingReviews,
      icon: Star,
    },
    {
      label: "Active Coupons",
      value: activeCoupons,
      icon: Ticket,
    },
  ];

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-gray-900">Dashboard</h2>
      <p className="mt-1 text-sm text-gray-500">
        Live overview backed by local mock data.
      </p>

      <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-4">
        {cards.map(({ label, value, sub, icon: Icon }) => (
          <div
            key={label}
            className="bg-white border border-gray-200 p-4 flex items-start gap-3"
          >
            <div className="p-2 bg-primary/10 text-primary">
              <Icon size={18} />
            </div>
            <div>
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-xl font-semibold text-gray-900">{value}</p>
              {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
