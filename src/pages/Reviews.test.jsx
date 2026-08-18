import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import Reviews from "./Reviews";
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

const mockServiceReview = {
  id: "srv-1",
  rating: 5,
  comment: "Fast delivery!",
  createdAt: "2024-06-01T10:00:00Z",
  order: { id: "order-12345678" },
  user: {
    id: "user-1",
    firstName: "John",
    lastName: "Doe",
    email: "john@test.com",
  },
};

function renderReviews() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <Reviews />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("Reviews page", () => {
  it("renders the Reviews heading", async () => {
    vi.mocked(api.get).mockResolvedValue({
      reviews: [],
      total: 0,
      page: 1,
      pageSize: 20,
      averageRating: null,
    });
    renderReviews();
    expect(screen.getByText("Reviews")).toBeInTheDocument();
  });

  it("renders service reviews in list", async () => {
    vi.mocked(api.get).mockResolvedValue({
      reviews: [mockServiceReview],
      total: 1,
      page: 1,
      pageSize: 20,
      averageRating: 5.0,
    });
    renderReviews();
    await waitFor(() =>
      expect(screen.getByText("John Doe")).toBeInTheDocument(),
    );
    expect(screen.getByText("john@test.com")).toBeInTheDocument();
    expect(screen.getByText("Fast delivery!")).toBeInTheDocument();
  });

  it("shows average rating summary", async () => {
    vi.mocked(api.get).mockResolvedValue({
      reviews: [mockServiceReview],
      total: 1,
      page: 1,
      pageSize: 20,
      averageRating: 5.0,
    });
    renderReviews();
    await waitFor(() => expect(screen.getByText("5.0")).toBeInTheDocument());
    expect(screen.getByText("Average Rating")).toBeInTheDocument();
  });

  it("shows 'No service reviews yet' when empty", async () => {
    vi.mocked(api.get).mockResolvedValue({
      reviews: [],
      total: 0,
      page: 1,
      pageSize: 20,
      averageRating: null,
    });
    renderReviews();
    await waitFor(() =>
      expect(screen.getByText("No service reviews yet.")).toBeInTheDocument(),
    );
  });

  it("shows dash for null comment", async () => {
    vi.mocked(api.get).mockResolvedValue({
      reviews: [{ ...mockServiceReview, comment: null }],
      total: 1,
      page: 1,
      pageSize: 20,
      averageRating: 5.0,
    });
    renderReviews();
    await waitFor(() =>
      expect(screen.getByText("John Doe")).toBeInTheDocument(),
    );
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("shows pagination when reviews exceed page limit and navigates pages", async () => {
    vi.mocked(api.get).mockResolvedValue({
      reviews: Array.from({ length: 20 }, (_, i) => ({
        ...mockServiceReview,
        id: `srv-${i}`,
      })),
      total: 50,
      page: 1,
      pageSize: 20,
      averageRating: 4.5,
    });
    renderReviews();
    await screen.findByText("Next ›");
    expect(screen.getByText("‹ Prev")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Next ›"));
    await waitFor(() =>
      expect(vi.mocked(api.get)).toHaveBeenCalledWith(
        expect.stringContaining("page=2"),
      ),
    );
    fireEvent.click(screen.getByText("‹ Prev"));
    await waitFor(() =>
      expect(vi.mocked(api.get)).toHaveBeenCalledWith(
        expect.stringContaining("page=1"),
      ),
    );
  });
});
