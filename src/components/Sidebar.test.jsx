import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Sidebar from "./Sidebar";
import { useAuth } from "../context/AuthContext";

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

const mockLogout = vi.fn();

const adminUser = {
  id: "1",
  firstName: "Admin",
  lastName: "User",
  email: "admin@test.com",
  role: "admin",
};

const storeOwnerUser = {
  id: "2",
  firstName: "Store",
  lastName: "Owner",
  email: "owner@test.com",
  role: "store_owner",
};

beforeEach(() => {
  mockLogout.mockReset();
  vi.mocked(useAuth).mockReturnValue({
    user: adminUser,
    loading: false,
    login: vi.fn(),
    logout: mockLogout,
  });
});

function renderSidebar(collapsed = false) {
  const onToggle = vi.fn();
  render(
    <MemoryRouter>
      <Sidebar collapsed={collapsed} onToggle={onToggle} />
    </MemoryRouter>,
  );
  return onToggle;
}

describe("Sidebar – expanded, admin", () => {
  it("shows the SipNow branding text when expanded", () => {
    renderSidebar(false);
    expect(
      screen.getByText(/SipNow/, { selector: "span" }),
    ).toBeInTheDocument();
  });

  it("shows Admin text in the branding when expanded", () => {
    renderSidebar(false);
    // "Admin" appears in the branding span
    const adminTexts = screen.getAllByText(/admin/i);
    expect(adminTexts.length).toBeGreaterThan(0);
  });

  it("shows all navigation items for admin", () => {
    renderSidebar(false);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Products")).toBeInTheDocument();
    expect(screen.getByText("Orders")).toBeInTheDocument();
    expect(screen.getByText("Catalogue")).toBeInTheDocument();
    expect(screen.getByText("Promotions")).toBeInTheDocument();
    expect(screen.getByText("Coupons")).toBeInTheDocument();
    expect(screen.getByText("Gift Cards")).toBeInTheDocument();
    expect(screen.getByText("Users")).toBeInTheDocument();
    expect(screen.getByText("Stock")).toBeInTheDocument();
    expect(screen.getByText("Suppliers")).toBeInTheDocument();
    expect(screen.getByText("Reviews")).toBeInTheDocument();
  });

  it("shows user name when expanded", () => {
    renderSidebar(false);
    expect(screen.getByText("Admin User")).toBeInTheDocument();
  });

  it("shows user role when expanded", () => {
    renderSidebar(false);
    expect(screen.getByText("admin")).toBeInTheDocument();
  });

  it("calls logout when sign out button is clicked", () => {
    renderSidebar(false);
    fireEvent.click(screen.getByTitle("Sign out"));
    expect(mockLogout).toHaveBeenCalledOnce();
  });

  it("calls onToggle when collapse button is clicked", () => {
    const onToggle = renderSidebar(false);
    fireEvent.click(screen.getByTitle("Collapse"));
    expect(onToggle).toHaveBeenCalledOnce();
  });
});

describe("Sidebar – collapsed", () => {
  it("shows S logo when collapsed", () => {
    renderSidebar(true);
    expect(screen.getByText("S")).toBeInTheDocument();
  });

  it("does not show user name text when collapsed", () => {
    renderSidebar(true);
    expect(screen.queryByText("Admin User")).not.toBeInTheDocument();
  });

  it("shows Expand title on toggle button when collapsed", () => {
    renderSidebar(true);
    expect(screen.getByTitle("Expand")).toBeInTheDocument();
  });
});

describe("Sidebar – store_owner role", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: storeOwnerUser,
      loading: false,
      login: vi.fn(),
      logout: mockLogout,
    });
  });

  it("shows formerly admin-only nav items for store_owner too", () => {
    renderSidebar(false);
    expect(screen.getByText("Catalogue")).toBeInTheDocument();
    expect(screen.getByText("General Promotions")).toBeInTheDocument();
    expect(screen.getByText("Gift Cards")).toBeInTheDocument();
    expect(screen.getByText("Users")).toBeInTheDocument();
  });

  it("shows non-admin nav items for store_owner", () => {
    renderSidebar(false);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Products")).toBeInTheDocument();
    expect(screen.getByText("Stock")).toBeInTheDocument();
  });

  it("shows store owner role label", () => {
    renderSidebar(false);
    expect(screen.getByText("store owner")).toBeInTheDocument();
  });
});
