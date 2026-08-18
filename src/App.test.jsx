import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { Outlet } from "react-router-dom";
import App from "./App";

vi.mock("./context/AuthContext", () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
  }),
  AuthProvider: ({ children }) => <>{children}</>,
}));

vi.mock("./lib/api", () => ({
  api: {
    get: vi.fn().mockResolvedValue({}),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    upload: vi.fn(),
  },
  saveToken: vi.fn(),
  clearToken: vi.fn(),
  getToken: vi.fn(() => null),
}));

// Stub all pages to lightweight renderable elements
vi.mock("./pages/Dashboard", () => ({
  default: () => <div>DashboardPage</div>,
}));
vi.mock("./pages/Products", () => ({ default: () => <div>ProductsPage</div> }));
vi.mock("./pages/Offers", () => ({ default: () => <div>OffersPage</div> }));
vi.mock("./pages/Users", () => ({ default: () => <div>UsersPage</div> }));
vi.mock("./pages/Stock", () => ({ default: () => <div>StockPage</div> }));
vi.mock("./pages/ProviderMaps", () => ({
  default: () => <div>ProviderMapsPage</div>,
}));
vi.mock("./pages/Catalogue", () => ({
  default: () => <div>CataloguePage</div>,
}));
vi.mock("./pages/Orders", () => ({ default: () => <div>OrdersPage</div> }));
vi.mock("./pages/Reviews", () => ({ default: () => <div>ReviewsPage</div> }));
vi.mock("./pages/Account", () => ({ default: () => <div>AccountPage</div> }));
vi.mock("./components/Layout", () => ({
  default: () => <Outlet />,
}));

describe("App routing", () => {
  it("renders the dashboard at / without requiring a signed-in user", async () => {
    render(<App />);
    await waitFor(() =>
      expect(screen.getByText("DashboardPage")).toBeInTheDocument(),
    );
  });

  it("renders an admin-only-formerly-gated route (users) without a signed-in user", async () => {
    window.location.hash = "#/users";
    render(<App />);
    await waitFor(() =>
      expect(screen.getByText("UsersPage")).toBeInTheDocument(),
    );
  });
});
