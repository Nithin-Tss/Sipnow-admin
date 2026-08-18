import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import Dashboard from "./Dashboard";
import { api } from "../lib/api";

vi.mock("../lib/api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    upload: vi.fn(),
  },
}));

const mockStats = {
  totalUsers: 42,
  totalProducts: 10,
  totalOrders: 55,
  totalRevenue: 1234.56,
  lowStockProducts: 3,
  ordersByStatus: { pending: 5, delivered: 20 },
};

function renderDashboard() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.mocked(api.get).mockResolvedValue(mockStats);
});

describe("Dashboard", () => {
  it("shows loading state initially", () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}));
    renderDashboard();
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("shows error message when query fails", async () => {
    vi.mocked(api.get).mockRejectedValue(new Error("Server error"));
    renderDashboard();
    await waitFor(() =>
      expect(screen.getByText("Server error")).toBeInTheDocument(),
    );
  });

  it("renders stat cards with correct values", async () => {
    renderDashboard();
    await waitFor(() => expect(screen.getByText("42")).toBeInTheDocument());
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("55")).toBeInTheDocument();
    expect(screen.getByText("$ 1234.56")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("renders stat card labels", async () => {
    renderDashboard();
    await waitFor(() =>
      expect(screen.getByText("Total Users")).toBeInTheDocument(),
    );
    expect(screen.getByText("Products")).toBeInTheDocument();
    expect(screen.getByText("Total Orders")).toBeInTheDocument();
    expect(screen.getByText("Revenue")).toBeInTheDocument();
    expect(screen.getByText("Low Stock (<5)")).toBeInTheDocument();
  });

  it("renders cards as links to their respective pages", async () => {
    renderDashboard();
    await waitFor(() =>
      expect(screen.getByText("Total Users")).toBeInTheDocument(),
    );
    expect(screen.getByRole("link", { name: /total users/i })).toHaveAttribute(
      "href",
      "/users",
    );
    expect(screen.getByRole("link", { name: /^products/i })).toHaveAttribute(
      "href",
      "/products",
    );
    expect(screen.getByRole("link", { name: /total orders/i })).toHaveAttribute(
      "href",
      "/orders",
    );
    expect(screen.getByRole("link", { name: /revenue/i })).toHaveAttribute(
      "href",
      "/orders",
    );
    expect(screen.getByRole("link", { name: /low stock/i })).toHaveAttribute(
      "href",
      "/stock",
    );
  });

  it("renders orders by status", async () => {
    renderDashboard();
    await waitFor(() =>
      expect(screen.getByText("pending")).toBeInTheDocument(),
    );
    expect(screen.getByText("delivered")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("20")).toBeInTheDocument();
  });

  it("shows 'No orders yet' when ordersByStatus is empty", async () => {
    vi.mocked(api.get).mockResolvedValue({
      ...mockStats,
      ordersByStatus: {},
    });
    renderDashboard();
    await waitFor(() =>
      expect(screen.getByText("No orders yet.")).toBeInTheDocument(),
    );
  });

  it("uses fallback style for unknown order status", async () => {
    vi.mocked(api.get).mockResolvedValue({
      ...mockStats,
      ordersByStatus: { unknown_status: 2 },
    });
    renderDashboard();
    await waitFor(() =>
      expect(screen.getByText("unknown_status")).toBeInTheDocument(),
    );
  });
});
