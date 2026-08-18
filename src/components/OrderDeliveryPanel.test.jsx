import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import OrderDeliveryPanel from "./OrderDeliveryPanel";

const BASE_DELIVERY = {
  id: "d1",
  status: "booked",
  deliveryType: "fast",
  priceCents: 1200,
  quotedPriceCents: 1200,
  consignmentNumber: "CN-123",
  windowFrom: "2026-07-02T01:00:00Z",
  windowTo: "2026-07-02T04:00:00Z",
  failureCode: null,
  failureMessage: null,
  attemptCount: 1,
  lastAttemptAt: "2026-07-02T00:30:00Z",
};

function baseProps(overrides = {}) {
  return {
    delivery: BASE_DELIVERY,
    isLoading: false,
    onRetry: vi.fn(),
    onCancel: vi.fn(),
    onRefresh: vi.fn(),
    onDownloadLabel: vi.fn(),
    isRetrying: false,
    isCancelling: false,
    isRefreshing: false,
    isDownloading: false,
    actionError: "",
    ...overrides,
  };
}

describe("OrderDeliveryPanel", () => {
  it("shows a loading state", () => {
    render(
      <OrderDeliveryPanel
        {...baseProps({ isLoading: true, delivery: undefined })}
      />,
    );
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("shows the 'no delivery record' state with a dispatch button when there is none", () => {
    render(<OrderDeliveryPanel {...baseProps({ delivery: null })} />);
    expect(screen.getByText("No delivery record yet")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Dispatch to Rendr/ }),
    ).toBeInTheDocument();
  });

  it("calls onRetry when dispatch is clicked with no delivery record", () => {
    const onRetry = vi.fn();
    render(<OrderDeliveryPanel {...baseProps({ delivery: null, onRetry })} />);
    fireEvent.click(screen.getByRole("button", { name: /Dispatch to Rendr/ }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("renders status, type, price, consignment and window for a booked delivery", () => {
    render(<OrderDeliveryPanel {...baseProps()} />);
    expect(screen.getByText("booked")).toBeInTheDocument();
    expect(screen.getByText("fast")).toBeInTheDocument();
    expect(screen.getByText("$ 12.00")).toBeInTheDocument();
    expect(screen.getByText("CN-123")).toBeInTheDocument();
  });

  it("does not show a Retry/Dispatch button for a healthy delivery", () => {
    render(<OrderDeliveryPanel {...baseProps()} />);
    expect(
      screen.queryByRole("button", {
        name: /Retry Dispatch|Dispatch to Rendr/,
      }),
    ).not.toBeInTheDocument();
  });

  it("shows the failure banner and Retry button when dispatch failed", () => {
    render(
      <OrderDeliveryPanel
        {...baseProps({
          delivery: {
            ...BASE_DELIVERY,
            status: "failed",
            failureMessage: "Invalid delivery address",
            attemptCount: 2,
          },
        })}
      />,
    );
    expect(screen.getByText("Dispatch to Rendr failed")).toBeInTheDocument();
    expect(screen.getByText("Invalid delivery address")).toBeInTheDocument();
    expect(screen.getByText("2 attempts")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Retry Dispatch/ }),
    ).toBeInTheDocument();
  });

  it("calls onRetry when Retry Dispatch is clicked", () => {
    const onRetry = vi.fn();
    render(
      <OrderDeliveryPanel
        {...baseProps({
          delivery: { ...BASE_DELIVERY, status: "failed" },
          onRetry,
        })}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Retry Dispatch/ }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("calls onRefresh when Refresh Status is clicked", () => {
    const onRefresh = vi.fn();
    render(<OrderDeliveryPanel {...baseProps({ onRefresh })} />);
    fireEvent.click(screen.getByRole("button", { name: /Refresh Status/ }));
    expect(onRefresh).toHaveBeenCalledOnce();
  });

  it("calls onDownloadLabel when Label is clicked", () => {
    const onDownloadLabel = vi.fn();
    render(<OrderDeliveryPanel {...baseProps({ onDownloadLabel })} />);
    fireEvent.click(screen.getByRole("button", { name: /Label/ }));
    expect(onDownloadLabel).toHaveBeenCalledOnce();
  });

  it("shows a price-mismatch warning when the booked price differs from the quote", () => {
    render(
      <OrderDeliveryPanel
        {...baseProps({
          delivery: {
            ...BASE_DELIVERY,
            priceCents: 1500,
            quotedPriceCents: 1200,
          },
        })}
      />,
    );
    expect(
      screen.getByText(/differs from the quoted price/),
    ).toBeInTheDocument();
  });

  it("hides the Cancel button for terminal statuses", () => {
    render(
      <OrderDeliveryPanel
        {...baseProps({ delivery: { ...BASE_DELIVERY, status: "delivered" } })}
      />,
    );
    expect(
      screen.queryByRole("button", { name: "Cancel" }),
    ).not.toBeInTheDocument();
  });

  it("reveals a reason field and calls onCancel with the typed reason on confirm", () => {
    const onCancel = vi.fn();
    render(<OrderDeliveryPanel {...baseProps({ onCancel })} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    const input = screen.getByPlaceholderText("Reason for cancellation");
    fireEvent.change(input, { target: { value: "Customer requested" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onCancel).toHaveBeenCalledWith("Customer requested");
  });

  it("disables Confirm until a reason is entered", () => {
    render(<OrderDeliveryPanel {...baseProps()} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("button", { name: "Confirm" })).toBeDisabled();
  });

  it("shows the action error message when present", () => {
    render(
      <OrderDeliveryPanel
        {...baseProps({ actionError: "Unable to reach Rendr" })}
      />,
    );
    expect(screen.getByText("Unable to reach Rendr")).toBeInTheDocument();
  });
});
