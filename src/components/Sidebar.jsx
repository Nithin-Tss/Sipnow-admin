import { NavLink, Link } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Tag,
  Users,
  Warehouse,
  Map,
  FolderTree,
  ShoppingBag,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  MessageSquare,
  Inbox,
  Ticket,
  BarChart2,
  Gift,
  Store,
  Percent,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const NAV = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/products", icon: Package, label: "Products" },
  { to: "/orders", icon: ShoppingBag, label: "Orders" },
  { to: "/catalogue", icon: FolderTree, label: "Catalogue" },
  { to: "/offers", icon: Tag, label: "General Promotions" },
  { to: "/promotions", icon: Percent, label: "Promotions" },
  { to: "/coupons", icon: Ticket, label: "Coupons" },
  { to: "/gift-cards", icon: Gift, label: "Gift Cards" },
  { to: "/stores", icon: Store, label: "Stores" },
  { to: "/compare", icon: BarChart2, label: "Compare" },
  { to: "/users", icon: Users, label: "Users" },
  { to: "/stock", icon: Warehouse, label: "Stock" },
  { to: "/provider-maps", icon: Map, label: "Suppliers" },
  { to: "/reviews", icon: MessageSquare, label: "Reviews" },
  { to: "/messages", icon: Inbox, label: "Messages" },
];

export default function Sidebar({ collapsed, onToggle }) {
  const { user, logout } = useAuth();

  return (
    <aside
      className={`flex flex-col bg-white border-r border-gray-200 h-screen sticky top-0 shrink-0 shadow-sm transition-[width] duration-200 ${
        collapsed ? "w-16" : "w-60"
      }`}
    >
      {/* Logo */}
      <div
        className={`flex items-center h-16 px-4 border-b border-gray-100 gap-2.5 ${collapsed ? "justify-center px-0" : ""}`}
      >
        <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-white font-bold text-sm shrink-0">
          S
        </span>
        {!collapsed && (
          <span className="font-semibold text-gray-900 text-sm leading-tight">
            SipNow
            <span className="block text-[11px] font-normal text-gray-400">
              Admin
            </span>
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {NAV.map(({ to, icon: Icon, label }) => {
          return (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                } ${collapsed ? "justify-center" : ""}`
              }
              title={collapsed ? label : undefined}
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* User + collapse toggle */}
      <div className="border-t border-gray-100 p-2">
        {!collapsed && user && (
          <div className="flex items-center gap-2.5 px-2 py-2">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold shrink-0">
              {user.firstName?.[0]}
              {user.lastName?.[0]}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-900 truncate">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-[11px] text-gray-400 capitalize truncate">
                {user.role.replace("_", " ")}
              </p>
            </div>
          </div>
        )}
        <div
          className={`flex items-center gap-1 mt-1 ${collapsed ? "flex-col" : ""}`}
        >
          <button
            onClick={logout}
            title="Sign out"
            className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          >
            <LogOut size={15} />
          </button>
          <Link
            to="/account"
            title="Account"
            className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          >
            <Settings size={15} />
          </Link>
          <button
            onClick={onToggle}
            title={collapsed ? "Expand" : "Collapse"}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors ml-auto"
          >
            {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>
        </div>
      </div>
    </aside>
  );
}
