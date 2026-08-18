import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import GiftCards from "./GiftCards";
import { api } from "../lib/api";

vi.mock("../lib/api", () => ({
  api: {
    get: vi.fn(),
    patch: vi.fn(),
  },
}));

const MOCK_CARDS = [
  {
    id: "gc1",
    code: "ABCD-EFGH-IJKL-MNOP",
    amount: 50,
    balance: 50,
    recipientName: "Jane Smith",
    recipientEmail: "jane@example.com",
    senderName: "Bob",
    senderEmail: null,
    message: "Happy birthday!",
    isActive: true,
    paymentStatus: "paid",
    expiresAt: null,
    purchasedAt: "2026-01-15T10:00:00.000Z",
    redemptions: [],
  },
  {
    id: "gc2",
    code: "QRST-UVWX-YZ23-4567",
    amount: 100,
    balance: 30,
    recipientName: "Alice Brown",
    recipientEmail: "alice@example.com",
    senderName: null,
    senderEmail: null,
    message: null,
    isActive: false,
    paymentStatus: "paid",
    expiresAt: null,
    purchasedAt: "2026-02-20T10:00:00.000Z",
    redemptions: [
      {
        orderId: "ord-abcdef123456",
        amount: 70,
        createdAt: "2026-03-01T10:00:00.000Z",
      },
    ],
  },
];

const MOCK_RESPONSE = { cards: MOCK_CARDS, total: 2 };

function renderPage() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <GiftCards />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.get).mockResolvedValue(MOCK_RESPONSE);
  vi.mocked(api.patch).mockResolvedValue({ ...MOCK_CARDS[0], isActive: false });
});

describe("GiftCards page", () => {
  describe("loading and error states", () => {
    it("shows loading state initially", () => {
      vi.mocked(api.get).mockReturnValue(new Promise(() => {}));
      renderPage();
      expect(screen.getByText("Loading…")).toBeInTheDocument();
    });

    it("shows error message when query fails", async () => {
      vi.mocked(api.get).mockRejectedValue(new Error("Server error"));
      renderPage();
      await waitFor(() =>
        expect(screen.getByText("Server error")).toBeInTheDocument(),
      );
    });

    it("shows empty state when no gift cards exist", async () => {
      vi.mocked(api.get).mockResolvedValue({ cards: [], total: 0 });
      renderPage();
      await waitFor(() =>
        expect(screen.getByText("No gift cards found")).toBeInTheDocument(),
      );
    });
  });

  describe("rendering", () => {
    it("renders the page heading", async () => {
      renderPage();
      await waitFor(() =>
        expect(screen.getByText("Gift Cards")).toBeInTheDocument(),
      );
    });

    it("shows total count", async () => {
      renderPage();
      await waitFor(() =>
        expect(screen.getByText("2 total")).toBeInTheDocument(),
      );
    });

    it("renders gift card codes", async () => {
      renderPage();
      await waitFor(() =>
        expect(screen.getByText("ABCD-EFGH-IJKL-MNOP")).toBeInTheDocument(),
      );
      expect(screen.getByText("QRST-UVWX-YZ23-4567")).toBeInTheDocument();
    });

    it("renders recipient names and emails", async () => {
      renderPage();
      await waitFor(() =>
        expect(screen.getByText("Jane Smith")).toBeInTheDocument(),
      );
      expect(screen.getByText("jane@example.com")).toBeInTheDocument();
      expect(screen.getByText("Alice Brown")).toBeInTheDocument();
      expect(screen.getByText("alice@example.com")).toBeInTheDocument();
    });

    it("renders amounts and balances", async () => {
      renderPage();
      // gc1: amount=50, balance=50 → "$ 50.00" appears twice; gc2: amount=100, balance=30
      await waitFor(() =>
        expect(screen.getAllByText("$ 50.00").length).toBeGreaterThanOrEqual(1),
      );
      expect(screen.getByText("$ 100.00")).toBeInTheDocument();
      expect(screen.getByText("$ 30.00")).toBeInTheDocument();
    });

    it("shows Active badge for active cards", async () => {
      renderPage();
      await waitFor(() =>
        expect(screen.getByText("Active")).toBeInTheDocument(),
      );
    });

    it("shows Inactive badge for inactive cards", async () => {
      renderPage();
      await waitFor(() =>
        expect(screen.getByText("Inactive")).toBeInTheDocument(),
      );
    });
  });

  describe("search", () => {
    it("renders the search input", async () => {
      renderPage();
      await waitFor(() =>
        expect(
          screen.getByPlaceholderText("Search by code, name or email…"),
        ).toBeInTheDocument(),
      );
    });

    it("calls api.get with search param when typing in search box", async () => {
      renderPage();
      await waitFor(() =>
        expect(screen.getByText("ABCD-EFGH-IJKL-MNOP")).toBeInTheDocument(),
      );

      const input = screen.getByPlaceholderText(
        "Search by code, name or email…",
      );
      await userEvent.type(input, "jane");

      await waitFor(() => {
        const lastCall = vi.mocked(api.get).mock.calls.at(-1)?.[0];
        expect(lastCall).toContain("search=jane");
      });
    });

    it("resets to page 1 when searching", async () => {
      renderPage();
      await waitFor(() =>
        expect(screen.getByText("ABCD-EFGH-IJKL-MNOP")).toBeInTheDocument(),
      );

      const input = screen.getByPlaceholderText(
        "Search by code, name or email…",
      );
      await userEvent.type(input, "alice");

      await waitFor(() => {
        const lastCall = vi.mocked(api.get).mock.calls.at(-1)?.[0];
        expect(lastCall).toContain("page=1");
      });
    });
  });

  describe("toggle active/inactive", () => {
    it("calls api.patch on toggle button click", async () => {
      renderPage();
      await waitFor(() =>
        expect(screen.getByText("ABCD-EFGH-IJKL-MNOP")).toBeInTheDocument(),
      );

      const toggleBtns = screen.getAllByTitle(/activate|deactivate/i);
      fireEvent.click(toggleBtns[0]);

      await waitFor(() =>
        expect(vi.mocked(api.patch)).toHaveBeenCalledWith(
          "/gift-cards/gc1/toggle",
          {},
        ),
      );
    });

    it("toggle button is titled Deactivate for active card", async () => {
      renderPage();
      await waitFor(() =>
        expect(screen.getByText("ABCD-EFGH-IJKL-MNOP")).toBeInTheDocument(),
      );
      expect(screen.getByTitle("Deactivate")).toBeInTheDocument();
    });

    it("toggle button is titled Activate for inactive card", async () => {
      renderPage();
      await waitFor(() =>
        expect(screen.getByText("QRST-UVWX-YZ23-4567")).toBeInTheDocument(),
      );
      expect(screen.getByTitle("Activate")).toBeInTheDocument();
    });
  });

  describe("redemption expansion", () => {
    it("does not show expand button for cards with no redemptions", async () => {
      renderPage();
      await waitFor(() =>
        expect(screen.getByText("ABCD-EFGH-IJKL-MNOP")).toBeInTheDocument(),
      );
      // gc1 has no redemptions — only gc2 has the expand chevron
      const expandBtns = screen.getAllByTitle("View redemptions");
      expect(expandBtns).toHaveLength(1);
    });

    it("expands redemption rows when chevron is clicked", async () => {
      renderPage();
      await waitFor(() =>
        expect(screen.getByText("QRST-UVWX-YZ23-4567")).toBeInTheDocument(),
      );

      expect(screen.queryByText("− $ 70.00")).not.toBeInTheDocument();

      fireEvent.click(screen.getByTitle("View redemptions"));

      await waitFor(() =>
        expect(screen.getByText("− $ 70.00")).toBeInTheDocument(),
      );
    });

    it("collapses redemption rows on second click", async () => {
      renderPage();
      await waitFor(() =>
        expect(screen.getByText("QRST-UVWX-YZ23-4567")).toBeInTheDocument(),
      );

      fireEvent.click(screen.getByTitle("View redemptions"));
      await waitFor(() =>
        expect(screen.getByText("− $ 70.00")).toBeInTheDocument(),
      );

      fireEvent.click(screen.getByTitle("View redemptions"));
      await waitFor(() =>
        expect(screen.queryByText("− $ 70.00")).not.toBeInTheDocument(),
      );
    });

    it("shows order ID in redemption row", async () => {
      renderPage();
      await waitFor(() =>
        expect(screen.getByText("QRST-UVWX-YZ23-4567")).toBeInTheDocument(),
      );

      fireEvent.click(screen.getByTitle("View redemptions"));

      await waitFor(() =>
        expect(screen.getByText(/order #ef123456/i)).toBeInTheDocument(),
      );
    });
  });
});
