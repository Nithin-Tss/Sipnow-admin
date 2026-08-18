import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import Messages from "./Messages";
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

const mockMessage = {
  id: "cm-1",
  name: "John Doe",
  email: "john@test.com",
  subject: "Order Enquiry",
  message: "Where is my order?",
  read: false,
  createdAt: "2024-06-01T10:00:00Z",
};

function renderMessages() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <Messages />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("Messages page", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders the Messages heading", async () => {
    vi.mocked(api.get).mockResolvedValue({
      messages: [],
      total: 0,
      unread: 0,
      page: 1,
      pageSize: 20,
    });
    renderMessages();
    expect(screen.getByText("Messages")).toBeInTheDocument();
  });

  it("renders contact messages in the list", async () => {
    vi.mocked(api.get).mockResolvedValue({
      messages: [mockMessage],
      total: 1,
      unread: 1,
      page: 1,
      pageSize: 20,
    });
    renderMessages();
    await waitFor(() =>
      expect(screen.getByText("John Doe")).toBeInTheDocument(),
    );
    expect(screen.getByText("john@test.com")).toBeInTheDocument();
    expect(screen.getByText("Order Enquiry")).toBeInTheDocument();
  });

  it("shows the unread count badge", async () => {
    vi.mocked(api.get).mockResolvedValue({
      messages: [mockMessage],
      total: 1,
      unread: 1,
      page: 1,
      pageSize: 20,
    });
    renderMessages();
    await waitFor(() =>
      expect(screen.getByText("1 unread")).toBeInTheDocument(),
    );
  });

  it("shows 'No messages yet' when empty", async () => {
    vi.mocked(api.get).mockResolvedValue({
      messages: [],
      total: 0,
      unread: 0,
      page: 1,
      pageSize: 20,
    });
    renderMessages();
    await waitFor(() =>
      expect(screen.getByText("No messages yet.")).toBeInTheDocument(),
    );
  });

  it("expands a message and marks it read on click", async () => {
    vi.mocked(api.get).mockResolvedValue({
      messages: [mockMessage],
      total: 1,
      unread: 1,
      page: 1,
      pageSize: 20,
    });
    vi.mocked(api.patch).mockResolvedValue({ ...mockMessage, read: true });
    renderMessages();
    await waitFor(() =>
      expect(screen.getByText("John Doe")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText("John Doe"));

    expect(await screen.findByText("Where is my order?")).toBeInTheDocument();
    await waitFor(() =>
      expect(api.patch).toHaveBeenCalledWith(
        "/admin/contact-messages/cm-1/read",
        {},
      ),
    );
  });

  it("does not re-mark an already-read message as read", async () => {
    vi.mocked(api.get).mockResolvedValue({
      messages: [{ ...mockMessage, read: true }],
      total: 1,
      unread: 0,
      page: 1,
      pageSize: 20,
    });
    renderMessages();
    await waitFor(() =>
      expect(screen.getByText("John Doe")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("John Doe"));
    expect(await screen.findByText("Where is my order?")).toBeInTheDocument();
    expect(api.patch).not.toHaveBeenCalled();
  });

  it("shows pagination when messages exceed page limit and navigates pages", async () => {
    vi.mocked(api.get).mockResolvedValue({
      messages: Array.from({ length: 20 }, (_, i) => ({
        ...mockMessage,
        id: `cm-${i}`,
      })),
      total: 50,
      unread: 0,
      page: 1,
      pageSize: 20,
    });
    renderMessages();
    await screen.findByText("Next ›");
    expect(screen.getByText("‹ Prev")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Next ›"));
    await waitFor(() =>
      expect(vi.mocked(api.get)).toHaveBeenCalledWith(
        expect.stringContaining("page=2"),
      ),
    );
  });
});
