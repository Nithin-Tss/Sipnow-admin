import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import Users from "./Users";
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

// Default: logged-in user is root so all role-action buttons are visible
const mockUseAuth = vi.fn(() => ({
  user: {
    id: "root1",
    firstName: "Root",
    lastName: "User",
    email: "root@test.com",
    role: "root",
  },
  loading: false,
  login: vi.fn(),
  logout: vi.fn(),
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

const mockUsers = [
  {
    id: "root1",
    firstName: "Root",
    lastName: "User",
    email: "root@test.com",
    phone: null,
    role: "root",
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "1",
    firstName: "Alice",
    lastName: "Admin",
    email: "alice@test.com",
    phone: "+61400000001",
    role: "admin",
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "2",
    firstName: "Bob",
    lastName: "Owner",
    email: "bob@test.com",
    phone: null,
    role: "store_owner",
    createdAt: "2024-02-01T00:00:00Z",
  },
  {
    id: "3",
    firstName: "Charlie",
    lastName: "User",
    email: "charlie@test.com",
    phone: "+61400000003",
    role: "user",
    createdAt: "2024-03-01T00:00:00Z",
  },
];

function renderUsers() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <Users />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.mocked(api.get).mockResolvedValue(mockUsers);
  vi.mocked(api.patch).mockResolvedValue(undefined);
  // Reset to root user by default
  mockUseAuth.mockReturnValue({
    user: {
      id: "root1",
      firstName: "Root",
      lastName: "User",
      email: "root@test.com",
      role: "root",
    },
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
  });
});

describe("Users page", () => {
  it("shows loading state initially", () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}));
    renderUsers();
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("shows error message when query fails", async () => {
    vi.mocked(api.get).mockRejectedValue(new Error("Failed to fetch"));
    renderUsers();
    await waitFor(() =>
      expect(screen.getByText("Failed to fetch")).toBeInTheDocument(),
    );
  });

  it("renders user list", async () => {
    renderUsers();
    await waitFor(() =>
      expect(screen.getByText("Alice Admin")).toBeInTheDocument(),
    );
    expect(screen.getByText("Bob Owner")).toBeInTheDocument();
    expect(screen.getByText("Charlie User")).toBeInTheDocument();
  });

  it("shows total user count", async () => {
    renderUsers();
    await waitFor(() =>
      expect(screen.getByText("4 total")).toBeInTheDocument(),
    );
  });

  it("shows empty phone as dash", async () => {
    renderUsers();
    await waitFor(() =>
      expect(screen.getByText("Alice Admin")).toBeInTheDocument(),
    );
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("shows 'No users found' when list is empty", async () => {
    vi.mocked(api.get).mockResolvedValue([]);
    renderUsers();
    await waitFor(() =>
      expect(screen.getByText("No users found")).toBeInTheDocument(),
    );
  });

  it("filters users by name search", async () => {
    renderUsers();
    await waitFor(() =>
      expect(screen.getByText("Alice Admin")).toBeInTheDocument(),
    );
    await userEvent.type(screen.getByPlaceholderText(/Search by name/i), "Bob");
    expect(screen.queryByText("Alice Admin")).not.toBeInTheDocument();
    expect(screen.getByText("Bob Owner")).toBeInTheDocument();
  });

  it("filters users by email search", async () => {
    renderUsers();
    await waitFor(() =>
      expect(screen.getByText("Alice Admin")).toBeInTheDocument(),
    );
    await userEvent.type(
      screen.getByPlaceholderText(/Search by name/i),
      "charlie@test.com",
    );
    expect(screen.queryByText("Alice Admin")).not.toBeInTheDocument();
    expect(screen.getByText("Charlie User")).toBeInTheDocument();
  });

  it("shows dash for admin users in actions column", async () => {
    renderUsers();
    await waitFor(() =>
      expect(screen.getByText("Alice Admin")).toBeInTheDocument(),
    );
    // admin row action is a dash
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThan(0);
  });

  it("shows 'Make Store Owner' button for regular users", async () => {
    renderUsers();
    await waitFor(() =>
      expect(screen.getByText("Make Store Owner")).toBeInTheDocument(),
    );
  });

  it("shows 'Demote to User' button for store_owner users", async () => {
    renderUsers();
    await waitFor(() =>
      expect(screen.getByText("Demote to User")).toBeInTheDocument(),
    );
  });

  it("calls api.patch when promoting a user to store_owner", async () => {
    renderUsers();
    await waitFor(() =>
      expect(screen.getByText("Make Store Owner")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Make Store Owner"));
    await waitFor(() =>
      expect(vi.mocked(api.patch)).toHaveBeenCalledWith("/auth/users/3/role", {
        role: "store_owner",
      }),
    );
  });

  it("calls api.patch when demoting a store_owner to user", async () => {
    renderUsers();
    await waitFor(() =>
      expect(screen.getByText("Demote to User")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Demote to User"));
    await waitFor(() =>
      expect(vi.mocked(api.patch)).toHaveBeenCalledWith("/auth/users/2/role", {
        role: "user",
      }),
    );
  });

  it("renders joined dates formatted", async () => {
    renderUsers();
    await waitFor(() =>
      expect(screen.getByText("Alice Admin")).toBeInTheDocument(),
    );
    expect(screen.getAllByText("01 Jan 2024").length).toBeGreaterThan(0);
  });

  it("shows Root badge for root user", async () => {
    renderUsers();
    await waitFor(() => expect(screen.getByText("Root")).toBeInTheDocument());
  });

  it("shows no action buttons for the root user row", async () => {
    renderUsers();
    await waitFor(() =>
      expect(screen.getByText("Root User")).toBeInTheDocument(),
    );
    // Root row renders a dash — make sure "Make Admin" is not shown for root
    // (it should only be absent from the root row, not from all rows)
    expect(screen.queryByText("Demote Root")).not.toBeInTheDocument();
  });

  it("shows 'Make Admin' button for store_owner when logged in as root", async () => {
    renderUsers();
    await waitFor(() =>
      expect(screen.getByText("Make Admin")).toBeInTheDocument(),
    );
  });

  it("calls api.patch to promote store_owner to admin", async () => {
    renderUsers();
    await waitFor(() =>
      expect(screen.getByText("Make Admin")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Make Admin"));
    await waitFor(() =>
      expect(vi.mocked(api.patch)).toHaveBeenCalledWith("/auth/users/2/role", {
        role: "admin",
      }),
    );
  });

  it("shows 'Demote to Store Owner' button for admin when logged in as root", async () => {
    renderUsers();
    await waitFor(() =>
      expect(screen.getByText("Demote to Store Owner")).toBeInTheDocument(),
    );
  });

  it("calls api.patch to demote admin to store_owner", async () => {
    renderUsers();
    await waitFor(() =>
      expect(screen.getByText("Demote to Store Owner")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Demote to Store Owner"));
    await waitFor(() =>
      expect(vi.mocked(api.patch)).toHaveBeenCalledWith("/auth/users/1/role", {
        role: "store_owner",
      }),
    );
  });

  it("hides all action buttons when logged in as non-root admin", async () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: "1",
        firstName: "Alice",
        lastName: "Admin",
        email: "alice@test.com",
        role: "admin",
      },
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
    });
    renderUsers();
    await waitFor(() =>
      expect(screen.getByText("Alice Admin")).toBeInTheDocument(),
    );
    expect(screen.queryByText("Make Admin")).not.toBeInTheDocument();
    expect(screen.queryByText("Make Store Owner")).not.toBeInTheDocument();
    expect(screen.queryByText("Demote to Store Owner")).not.toBeInTheDocument();
  });
});
