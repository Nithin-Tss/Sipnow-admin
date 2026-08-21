import { useQuery } from "@tanstack/react-query";
import {
  Package,
  ShoppingBag,
  Users,
  MessageSquare,
  Star,
  Ticket,
  AlertTriangle,
} from "lucide-react";
import { apiFetch } from "../lib/apiClient";
import { reviewsStore, messagesStore, couponsStore } from "../lib/entityStores";

export default function Dashboard() {
  const stats = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => apiFetch("/dashboard/stats"),
  });

  const pendingReviews = useQuery({
    queryKey: ["dashboard-pending-reviews"],
    queryFn: () => reviewsStore.list({ status: "pending", perPage: 1 }),
  });

  const pendingMessages = useQuery({
    queryKey: ["dashboard-pending-messages"],
    queryFn: () => messagesStore.list({ status: "pending", perPage: 1 }),
  });

  const activeCoupons = useQuery({
    queryKey: ["dashboard-active-coupons"],
    queryFn: () => couponsStore.list({ perPage: 1000 }),
  });

  const activeCouponsCount = (activeCoupons.data?.items ?? []).filter(
    (c) => c.active,
  ).length;

  const cards = [
    {
      label: "Products",
      value: stats.data?.totalProducts ?? "…",
      icon: Package,
    },
    {
      label: "Orders",
      value: stats.data?.totalOrders ?? "…",
      sub: stats.data
        ? `$${Number(stats.data.totalRevenue).toFixed(2)} revenue`
        : undefined,
      icon: ShoppingBag,
    },
    {
      label: "Users",
      value: stats.data?.totalUsers ?? "…",
      icon: Users,
    },
    {
      label: "Low Stock Products",
      value: stats.data?.lowStockProducts ?? "…",
      icon: AlertTriangle,
    },
    {
      label: "Pending Messages",
      value: pendingMessages.data?.total ?? "…",
      icon: MessageSquare,
    },
    {
      label: "Pending Reviews",
      value: pendingReviews.data?.total ?? "…",
      icon: Star,
    },
    {
      label: "Active Coupons",
      value: activeCoupons.isLoading ? "…" : activeCouponsCount,
      icon: Ticket,
    },
  ];

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-gray-900">Dashboard</h2>
      <p className="mt-1 text-sm text-gray-500">
        Live overview from the SipNow backend.
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

      {stats.data?.ordersByStatus && (
        <div className="mt-6 bg-white border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Orders by Status
          </h3>
          <div className="flex flex-wrap gap-3">
            {Object.entries(stats.data.ordersByStatus).map(
              ([status, count]) => (
                <span
                  key={status}
                  className="px-3 py-1 text-xs bg-gray-50 text-gray-700 capitalize"
                >
                  {status}: {count}
                </span>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}
