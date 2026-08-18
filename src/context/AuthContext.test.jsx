import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider, useAuth } from "./AuthContext";
import { api, saveToken, clearToken, getToken } from "../lib/api";

vi.mock("../lib/api", () => ({
  api: {
    get: vi.fn(),
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

function TestConsumer() {
  const { user, loading, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user">{user ? user.email : "null"}</span>
      <span data-testid="role">{user?.role ?? "none"}</span>
      <button onClick={() => login("a@test.com", "pass")}>login</button>
      <button onClick={logout}>logout</button>
    </div>
  );
}

function renderProvider() {
  return render(
    <AuthProvider>
      <TestConsumer />
    </AuthProvider>,
  );
}

beforeEach(() => {
  vi.mocked(getToken).mockReturnValue(null);
  vi.mocked(api.get).mockResolvedValue(undefined);
  vi.mocked(api.post).mockResolvedValue(undefined);
  vi.mocked(saveToken).mockImplementation(() => {});
  vi.mocked(clearToken).mockImplementation(() => {});
  localStorage.clear();
});

afterEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe("useAuth outside AuthProvider", () => {
  it("throws when used outside AuthProvider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow(
      "useAuth must be inside AuthProvider",
    );
    spy.mockRestore();
  });
});

describe("AuthProvider bootstrap – no token", () => {
  it("sets loading=false and user=null when no token", async () => {
    vi.mocked(getToken).mockReturnValue(null);
    renderProvider();
    await waitFor(() =>
      expect(screen.getByTestId("loading").textContent).toBe("false"),
    );
    expect(screen.getByTestId("user").textContent).toBe("null");
  });
});

describe("AuthProvider bootstrap – valid token", () => {
  it("fetches /auth/me and sets user when token exists", async () => {
    vi.mocked(getToken).mockReturnValue("tok");
    vi.mocked(api.get).mockResolvedValue({
      id: "1",
      firstName: "Admin",
      lastName: "User",
      email: "admin@test.com",
      role: "admin",
    });
    renderProvider();
    await waitFor(() =>
      expect(screen.getByTestId("user").textContent).toBe("admin@test.com"),
    );
  });

  it("calls clearToken when /auth/me returns a non-permitted role", async () => {
    vi.mocked(getToken).mockReturnValue("tok");
    vi.mocked(api.get).mockResolvedValue({
      id: "1",
      firstName: "Regular",
      lastName: "User",
      email: "u@test.com",
      role: "user",
    });
    renderProvider();
    await waitFor(() =>
      expect(screen.getByTestId("loading").textContent).toBe("false"),
    );
    expect(vi.mocked(clearToken)).toHaveBeenCalled();
    expect(screen.getByTestId("user").textContent).toBe("null");
  });

  it("calls clearToken when /auth/me throws", async () => {
    vi.mocked(getToken).mockReturnValue("tok");
    vi.mocked(api.get).mockRejectedValue(new Error("Unauthorized"));
    renderProvider();
    await waitFor(() =>
      expect(screen.getByTestId("loading").textContent).toBe("false"),
    );
    expect(vi.mocked(clearToken)).toHaveBeenCalled();
  });
});

describe("login", () => {
  it("calls api.post and saves token on success for admin", async () => {
    vi.mocked(getToken).mockReturnValue(null);
    vi.mocked(api.post).mockResolvedValue({
      token: "new-tok",
      user: {
        id: "1",
        firstName: "Admin",
        lastName: "User",
        email: "admin@test.com",
        role: "admin",
      },
    });
    renderProvider();
    await waitFor(() =>
      expect(screen.getByTestId("loading").textContent).toBe("false"),
    );
    await userEvent.click(screen.getByText("login"));
    await waitFor(() =>
      expect(screen.getByTestId("user").textContent).toBe("admin@test.com"),
    );
    expect(vi.mocked(saveToken)).toHaveBeenCalledWith("new-tok");
  });

  it("saves token for store_owner role", async () => {
    vi.mocked(getToken).mockReturnValue(null);
    vi.mocked(api.post).mockResolvedValue({
      token: "tok2",
      user: {
        id: "2",
        firstName: "Store",
        lastName: "Owner",
        email: "owner@test.com",
        role: "store_owner",
      },
    });
    renderProvider();
    await waitFor(() =>
      expect(screen.getByTestId("loading").textContent).toBe("false"),
    );
    await userEvent.click(screen.getByText("login"));
    await waitFor(() =>
      expect(screen.getByTestId("user").textContent).toBe("owner@test.com"),
    );
  });

  it("throws when role is not admin or store_owner", async () => {
    vi.mocked(getToken).mockReturnValue(null);
    vi.mocked(api.post).mockResolvedValue({
      token: "tok3",
      user: {
        id: "3",
        firstName: "Regular",
        lastName: "User",
        email: "u@test.com",
        role: "user",
      },
    });

    let caughtErr = null;
    function ThrowingConsumer() {
      const { login } = useAuth();
      return (
        <button
          onClick={async () => {
            try {
              await login("u@test.com", "pass");
            } catch (e) {
              caughtErr = e.message;
            }
          }}
        >
          go
        </button>
      );
    }
    render(
      <AuthProvider>
        <ThrowingConsumer />
      </AuthProvider>,
    );
    await userEvent.click(screen.getByText("go"));
    await waitFor(() => expect(caughtErr).toContain("Access restricted"));
  });
});

describe("logout", () => {
  it("clears token and sets user to null", async () => {
    vi.mocked(getToken).mockReturnValue("tok");
    vi.mocked(api.get).mockResolvedValue({
      id: "1",
      firstName: "Admin",
      lastName: "User",
      email: "admin@test.com",
      role: "admin",
    });
    renderProvider();
    await waitFor(() =>
      expect(screen.getByTestId("user").textContent).toBe("admin@test.com"),
    );
    await userEvent.click(screen.getByText("logout"));
    expect(vi.mocked(clearToken)).toHaveBeenCalled();
    expect(screen.getByTestId("user").textContent).toBe("null");
  });
});
