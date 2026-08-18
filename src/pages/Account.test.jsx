import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import Account from "./Account";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

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

const mockUser = {
  id: "1",
  firstName: "Admin",
  lastName: "User",
  email: "admin@test.com",
  role: "admin",
};

function renderAccount() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <Account />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function getPasswordInputs() {
  const currentPw = document.querySelector(
    'input[autocomplete="current-password"]',
  );
  const newPwInputs = document.querySelectorAll(
    'input[autocomplete="new-password"]',
  );
  return {
    currentPw,
    newPw: newPwInputs[0],
    confirm: newPwInputs[1],
  };
}

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({
    user: mockUser,
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
  });
  vi.mocked(api.patch).mockResolvedValue(undefined);
});

describe("Account page", () => {
  it("shows user info", () => {
    renderAccount();
    expect(screen.getByText("Admin User")).toBeInTheDocument();
    expect(screen.getByText("admin@test.com")).toBeInTheDocument();
    expect(screen.getByText("admin")).toBeInTheDocument();
  });

  it("shows store owner role with underscore replaced", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: "2",
        firstName: "Owner",
        lastName: "Test",
        email: "o@test.com",
        role: "store_owner",
      },
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
    });
    renderAccount();
    expect(screen.getByText("store owner")).toBeInTheDocument();
  });

  it("renders the change password form", () => {
    renderAccount();
    expect(screen.getByText("Change Password")).toBeInTheDocument();
    expect(screen.getByText("Current Password")).toBeInTheDocument();
    expect(screen.getByText("New Password")).toBeInTheDocument();
    expect(screen.getByText("Confirm New Password")).toBeInTheDocument();
  });

  it("shows the Update Password button", () => {
    renderAccount();
    expect(screen.getByText("Update Password")).toBeInTheDocument();
  });

  it("shows error when new passwords do not match", async () => {
    renderAccount();
    const { currentPw, newPw, confirm } = getPasswordInputs();
    fireEvent.change(currentPw, { target: { value: "oldpass" } });
    fireEvent.change(newPw, { target: { value: "newpass1" } });
    fireEvent.change(confirm, { target: { value: "newpass2" } });
    fireEvent.click(screen.getByText("Update Password"));
    expect(screen.getByText("New passwords do not match")).toBeInTheDocument();
  });

  it("shows error when new password is too short", async () => {
    renderAccount();
    const { currentPw, newPw, confirm } = getPasswordInputs();
    fireEvent.change(currentPw, { target: { value: "oldpass" } });
    fireEvent.change(newPw, { target: { value: "short" } });
    fireEvent.change(confirm, { target: { value: "short" } });
    fireEvent.click(screen.getByText("Update Password"));
    expect(
      screen.getByText("New password must be at least 8 characters"),
    ).toBeInTheDocument();
  });

  it("calls api.patch on valid password change", async () => {
    renderAccount();
    const { currentPw, newPw, confirm } = getPasswordInputs();
    fireEvent.change(currentPw, { target: { value: "oldpass123" } });
    fireEvent.change(newPw, { target: { value: "newpass123" } });
    fireEvent.change(confirm, { target: { value: "newpass123" } });
    fireEvent.click(screen.getByText("Update Password"));
    await waitFor(() =>
      expect(vi.mocked(api.patch)).toHaveBeenCalledWith("/auth/password", {
        currentPassword: "oldpass123",
        newPassword: "newpass123",
      }),
    );
  });

  it("shows success message after password change", async () => {
    vi.mocked(api.patch).mockResolvedValue(undefined);
    renderAccount();
    const { currentPw, newPw, confirm } = getPasswordInputs();
    fireEvent.change(currentPw, { target: { value: "oldpass123" } });
    fireEvent.change(newPw, { target: { value: "newpass123" } });
    fireEvent.change(confirm, { target: { value: "newpass123" } });
    fireEvent.click(screen.getByText("Update Password"));
    await waitFor(() =>
      expect(
        screen.getByText("Password updated successfully."),
      ).toBeInTheDocument(),
    );
  });

  it("shows error message when api.patch fails", async () => {
    vi.mocked(api.patch).mockRejectedValue(
      new Error("Incorrect current password"),
    );
    renderAccount();
    const { currentPw, newPw, confirm } = getPasswordInputs();
    fireEvent.change(currentPw, { target: { value: "wrongpass" } });
    fireEvent.change(newPw, { target: { value: "newpass123" } });
    fireEvent.change(confirm, { target: { value: "newpass123" } });
    fireEvent.click(screen.getByText("Update Password"));
    await waitFor(() =>
      expect(
        screen.getByText("Incorrect current password"),
      ).toBeInTheDocument(),
    );
  });

  it("shows 'Signed in as' label", () => {
    renderAccount();
    expect(screen.getByText("Signed in as")).toBeInTheDocument();
  });
});
