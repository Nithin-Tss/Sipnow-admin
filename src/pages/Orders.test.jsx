import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import Orders from "./Orders";
import { api } from "../lib/api";

vi.mock("../lib/api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    upload: vi.fn(),
    getBlob: vi.fn(),
  },
}));

const mockOrder = {
  id: "order-abcdef12",
  user: {
    firstName: "John",
    lastName: "Doe",
    email: "john@test.com",
    phone: "+61400000001",
  },
  guestName: null,
  guestEmail: null,
  guestPhone: null,
  items: [
    { id: "i1", name: "Red Wine", quantity: 2, price: 25.0 },
    { id: "i2", name: "White Wine", quantity: 1, price: 20.0 },
  ],
  totalAmount: 70.0,
  status: "pending",
  paymentStatus: "pending",
  paymentMethod: null,
  shippingAddress: { line1: "123 Main St", city: "Sydney", country: "AU" },
  createdAt: "2024-06-01T10:00:00Z",
  updatedAt: "2024-06-01T10:00:00Z",
};

const mockDeliveredOrder = {
  ...mockOrder,
  id: "order-delivered1",
  status: "delivered",
  paymentStatus: "paid",
  paymentMethod: "cash",
};

const mockGuestOrder = {
  id: "order-guest1234",
  user: null,
  guestName: "Jane Guest",
  guestEmail: "jane@guest.com",
  guestPhone: "+61400000002",
  items: [],
  totalAmount: 0,
  status: "delivered",
  paymentStatus: "paid",
  paymentMethod: null,
  shippingAddress: {},
  createdAt: "2024-06-02T10:00:00Z",
  updatedAt: "2024-06-02T10:00:00Z",
};

// The orders list and the per-order delivery detail panel both call
// api.get — route by path so existing order-list assertions don't need to
// know about the delivery endpoint, and so the delivery panel gets a
// realistic "no delivery record yet" 404 by default.
function mockOrdersEndpoint(response) {
  vi.mocked(api.get).mockImplementation((path) => {
    if (path.startsWith("/admin/deliveries/")) {
      return Promise.reject(new Error("No delivery record for this order yet"));
    }
    return Promise.resolve(response);
  });
}

async function openModal(order = mockOrder) {
  mockOrdersEndpoint({ orders: [order], total: 1 });
  renderOrders();
  const name = order.user
    ? `${order.user.firstName} ${order.user.lastName}`
    : (order.guestName ?? "Guest");
  await waitFor(() => expect(screen.getByText(name)).toBeInTheDocument());
  fireEvent.click(screen.getByText(name).closest("tr"));
  await waitFor(() =>
    expect(screen.getByText("Order Status")).toBeInTheDocument(),
  );
}

function renderOrders() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <Orders />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockOrdersEndpoint({ orders: [mockOrder], total: 1 });
  vi.mocked(api.patch).mockResolvedValue({ ...mockOrder, status: "cancelled" });
  vi.mocked(api.post).mockResolvedValue({});
  vi.spyOn(globalThis, "confirm").mockReturnValue(true);
});

describe("Orders page", () => {
  it("shows loading state initially", () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}));
    renderOrders();
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("shows error message when query fails", async () => {
    vi.mocked(api.get).mockRejectedValue(new Error("Network error"));
    renderOrders();
    await waitFor(() =>
      expect(screen.getByText("Network error")).toBeInTheDocument(),
    );
  });

  it("renders orders list", async () => {
    renderOrders();
    await waitFor(() =>
      expect(screen.getByText("John Doe")).toBeInTheDocument(),
    );
    expect(screen.getByText("john@test.com")).toBeInTheDocument();
  });

  it("shows total count", async () => {
    renderOrders();
    await waitFor(() =>
      expect(screen.getByText("1 total")).toBeInTheDocument(),
    );
  });

  it("shows no orders found when empty", async () => {
    vi.mocked(api.get).mockResolvedValue({ orders: [], total: 0 });
    renderOrders();
    await waitFor(() =>
      expect(screen.getByText("No orders found")).toBeInTheDocument(),
    );
  });

  it("shows order status badge", async () => {
    renderOrders();
    await waitFor(() =>
      expect(screen.getByText("pending")).toBeInTheDocument(),
    );
  });

  it("shows total amount", async () => {
    renderOrders();
    await waitFor(() =>
      expect(screen.getByText("$ 70.00")).toBeInTheDocument(),
    );
  });

  it("opens order detail modal on row click", async () => {
    renderOrders();
    await waitFor(() =>
      expect(screen.getByText("John Doe")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("John Doe").closest("tr"));
    await waitFor(() =>
      expect(screen.getByText("Red Wine")).toBeInTheDocument(),
    );
    expect(screen.getByText("White Wine")).toBeInTheDocument();
  });

  it("closes modal when X is clicked", async () => {
    renderOrders();
    await waitFor(() =>
      expect(screen.getByText("John Doe")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("John Doe").closest("tr"));
    await waitFor(() =>
      expect(screen.getByText("Red Wine")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("button", { name: "" }));
    await waitFor(() =>
      expect(screen.queryByText("Red Wine")).not.toBeInTheDocument(),
    );
  });

  it("shows shipping address in modal", async () => {
    renderOrders();
    await waitFor(() =>
      expect(screen.getByText("John Doe")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("John Doe").closest("tr"));
    await waitFor(() =>
      expect(screen.getByText(/123 Main St/)).toBeInTheDocument(),
    );
  });

  it("shows the Order Status badge reflecting the order's current status", async () => {
    renderOrders();
    await waitFor(() =>
      expect(screen.getByText("John Doe")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("John Doe").closest("tr"));
    await waitFor(() =>
      expect(screen.getByText("Order Status")).toBeInTheDocument(),
    );
  });

  it("does not show a Cancel Order button for a delivered order", async () => {
    await openModal(mockDeliveredOrder);
    expect(
      screen.queryByRole("button", { name: "Cancel Order" }),
    ).not.toBeInTheDocument();
  });

  it("calls api.patch with cancelled status when Cancel Order is confirmed", async () => {
    await openModal();
    fireEvent.click(screen.getByRole("button", { name: "Cancel Order" }));
    await waitFor(() =>
      expect(vi.mocked(api.patch)).toHaveBeenCalledWith(
        "/orders/order-abcdef12/status",
        { status: "cancelled" },
      ),
    );
  });

  it("does not call api.patch when the cancel confirmation is declined", async () => {
    vi.mocked(globalThis.confirm).mockReturnValue(false);
    await openModal();
    fireEvent.click(screen.getByRole("button", { name: "Cancel Order" }));
    expect(api.patch).not.toHaveBeenCalled();
  });

  it("shows status update error when cancel fails", async () => {
    vi.mocked(api.patch).mockRejectedValue(new Error("Update failed"));
    await openModal();
    fireEvent.click(screen.getByRole("button", { name: "Cancel Order" }));
    await waitFor(() =>
      expect(screen.getByText("Update failed")).toBeInTheDocument(),
    );
  });

  it("renders guest order with guest name", async () => {
    mockOrdersEndpoint({ orders: [mockGuestOrder], total: 1 });
    renderOrders();
    await waitFor(() =>
      expect(screen.getByText("Jane Guest")).toBeInTheDocument(),
    );
  });

  it("renders guest order with guest email", async () => {
    mockOrdersEndpoint({ orders: [mockGuestOrder], total: 1 });
    renderOrders();
    await waitFor(() =>
      expect(screen.getByText("jane@guest.com")).toBeInTheDocument(),
    );
  });

  it("shows Guest badge in modal for guest order", async () => {
    await openModal(mockGuestOrder);
    expect(screen.getByText("Guest")).toBeInTheDocument();
  });

  it("updates search and resets to page 1", async () => {
    renderOrders();
    await waitFor(() =>
      expect(screen.getByText("John Doe")).toBeInTheDocument(),
    );
    await userEvent.type(
      screen.getByPlaceholderText(/Search by name/i),
      "john",
    );
    await waitFor(() =>
      expect(vi.mocked(api.get)).toHaveBeenCalledWith(
        expect.stringContaining("search=john"),
      ),
    );
  });

  it("filters by status", async () => {
    renderOrders();
    await waitFor(() =>
      expect(screen.getByText("John Doe")).toBeInTheDocument(),
    );
    fireEvent.change(screen.getAllByRole("combobox")[0], {
      target: { value: "delivered" },
    });
    await waitFor(() =>
      expect(vi.mocked(api.get)).toHaveBeenCalledWith(
        expect.stringContaining("status=delivered"),
      ),
    );
  });

  it("shows pagination when total exceeds per-page limit", async () => {
    vi.mocked(api.get).mockResolvedValue({
      orders: Array.from({ length: 20 }, (_, i) => ({
        ...mockOrder,
        id: `order-${i.toString().padStart(8, "0")}`,
      })),
      total: 40,
    });
    renderOrders();
    await waitFor(() => expect(screen.getByText("← Prev")).toBeInTheDocument());
    expect(screen.getByText("Next →")).toBeInTheDocument();
  });

  it("prev button is disabled on first page", async () => {
    vi.mocked(api.get).mockResolvedValue({
      orders: Array.from({ length: 20 }, (_, i) => ({
        ...mockOrder,
        id: `order-${i.toString().padStart(8, "0")}`,
      })),
      total: 40,
    });
    renderOrders();
    await waitFor(() => expect(screen.getByText("← Prev")).toBeDisabled());
  });

  describe("payment info display", () => {
    it("shows payment status badge for delivered order", async () => {
      await openModal(mockDeliveredOrder);
      await waitFor(() => expect(screen.getByText("paid")).toBeInTheDocument());
    });

    it("shows payment method for delivered order with method recorded", async () => {
      await openModal(mockDeliveredOrder);
      await waitFor(() => expect(screen.getByText("cash")).toBeInTheDocument());
    });

    it("hides payment info entirely when no payment method is known yet (COD, pre-delivery)", async () => {
      await openModal(mockOrder);
      await waitFor(() =>
        expect(screen.getByText("Order Status")).toBeInTheDocument(),
      );
      expect(screen.queryByText("Payment status")).not.toBeInTheDocument();
      expect(screen.queryByText("Payment method")).not.toBeInTheDocument();
    });

    it("shows payment info for a card order that is still pending, before delivery", async () => {
      await openModal({
        ...mockOrder,
        status: "pending",
        paymentStatus: "pending",
        paymentMethod: "card",
      });
      expect(screen.getByText("Payment status")).toBeInTheDocument();
      expect(screen.getAllByText("pending").length).toBeGreaterThan(0);
      expect(screen.getByText("card")).toBeInTheDocument();
    });

    it("shows a failed-status badge distinctly from pending/paid", async () => {
      await openModal({
        ...mockOrder,
        paymentStatus: "failed",
        paymentMethod: "card",
      });
      const badge = screen.getByText("failed");
      expect(badge.className).toContain("border-gray-400");
      expect(badge.textContent).toMatch(/failed/i);
    });
  });

  describe("delivery panel", () => {
    it("shows 'No delivery record yet' when the order has not been dispatched", async () => {
      await openModal();
      await waitFor(() =>
        expect(screen.getByText("No delivery record yet")).toBeInTheDocument(),
      );
    });

    it("renders delivery details when a Delivery record exists", async () => {
      vi.mocked(api.get).mockImplementation((path) => {
        if (path.startsWith("/admin/deliveries/")) {
          return Promise.resolve({
            id: "d1",
            status: "booked",
            deliveryType: "fast",
            priceCents: 1200,
            quotedPriceCents: 1200,
            consignmentNumber: "CN-999",
            windowFrom: null,
            windowTo: null,
            failureCode: null,
            failureMessage: null,
            attemptCount: 1,
            lastAttemptAt: null,
          });
        }
        return Promise.resolve({ orders: [mockOrder], total: 1 });
      });
      renderOrders();
      await waitFor(() =>
        expect(screen.getByText("John Doe")).toBeInTheDocument(),
      );
      fireEvent.click(screen.getByText("John Doe").closest("tr"));
      await waitFor(() =>
        expect(screen.getByText("CN-999")).toBeInTheDocument(),
      );
      expect(screen.getByText("booked")).toBeInTheDocument();
    });

    it("dispatches to Rendr and refreshes the delivery panel on success", async () => {
      vi.mocked(api.post).mockResolvedValue({
        id: "d1",
        status: "requested",
        deliveryType: "standard",
        priceCents: null,
        quotedPriceCents: 800,
        consignmentNumber: null,
        windowFrom: null,
        windowTo: null,
        failureCode: null,
        failureMessage: null,
        attemptCount: 1,
        lastAttemptAt: null,
      });
      await openModal();
      await waitFor(() =>
        expect(screen.getByText("No delivery record yet")).toBeInTheDocument(),
      );
      fireEvent.click(
        screen.getByRole("button", { name: /Dispatch to Rendr/ }),
      );
      await waitFor(() =>
        expect(vi.mocked(api.post)).toHaveBeenCalledWith(
          "/admin/deliveries/order/order-abcdef12/retry",
          {},
        ),
      );
    });

    it("shows an error when a delivery action fails", async () => {
      vi.mocked(api.post).mockRejectedValue(new Error("Rendr unreachable"));
      await openModal();
      await waitFor(() =>
        expect(screen.getByText("No delivery record yet")).toBeInTheDocument(),
      );
      fireEvent.click(
        screen.getByRole("button", { name: /Dispatch to Rendr/ }),
      );
      await waitFor(() =>
        expect(screen.getByText("Rendr unreachable")).toBeInTheDocument(),
      );
    });
  });

  describe("pickup fulfillment", () => {
    const mockPickupOrder = {
      ...mockOrder,
      id: "order-pickup1234",
      fulfillmentType: "pickup",
      shippingAddress: null,
      pickupStore: {
        name: "SipNow Wollert",
        line1: "1 Main St",
        line2: null,
        city: "Wollert",
        county: "VIC",
        postcode: "3750",
        phone: null,
        hours: "Mon-Fri 9am-6pm",
      },
    };

    it("shows the pickup store and Mark Ready/Mark Collected controls instead of the delivery panel", async () => {
      await openModal(mockPickupOrder);
      expect(screen.getByText("Pickup Store")).toBeInTheDocument();
      expect(screen.getByText(/SipNow Wollert/)).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /mark ready for pickup/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /mark collected/i }),
      ).toBeInTheDocument();
      expect(
        screen.queryByText("No delivery record yet"),
      ).not.toBeInTheDocument();
      expect(screen.queryByText("Shipping Address")).not.toBeInTheDocument();
    });

    it("marks a pickup order ready for pickup", async () => {
      vi.mocked(api.patch).mockResolvedValue({
        ...mockPickupOrder,
        status: "ready_for_pickup",
      });
      await openModal(mockPickupOrder);
      fireEvent.click(
        screen.getByRole("button", { name: /mark ready for pickup/i }),
      );
      await waitFor(() =>
        expect(api.patch).toHaveBeenCalledWith(
          "/orders/order-pickup1234/status",
          { status: "ready_for_pickup" },
        ),
      );
    });

    it("marks a pickup order collected", async () => {
      vi.mocked(api.patch).mockResolvedValue({
        ...mockPickupOrder,
        status: "delivered",
      });
      await openModal(mockPickupOrder);
      fireEvent.click(screen.getByRole("button", { name: /mark collected/i }));
      await waitFor(() =>
        expect(api.patch).toHaveBeenCalledWith(
          "/orders/order-pickup1234/status",
          { status: "delivered" },
        ),
      );
    });

    it("hides the Mark Ready button once already ready for pickup", async () => {
      await openModal({
        ...mockPickupOrder,
        status: "ready_for_pickup",
      });
      expect(
        screen.queryByRole("button", { name: /mark ready for pickup/i }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /mark collected/i }),
      ).toBeInTheDocument();
    });

    it("hides both pickup controls once the order is collected", async () => {
      await openModal({
        ...mockPickupOrder,
        status: "delivered",
      });
      expect(
        screen.queryByRole("button", { name: /mark ready for pickup/i }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /mark collected/i }),
      ).not.toBeInTheDocument();
    });
  });
});
