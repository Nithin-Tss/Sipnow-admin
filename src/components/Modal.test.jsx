import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Modal from "./Modal";

describe("Modal", () => {
  it("renders the title", () => {
    render(
      <Modal title="Test Modal" onClose={vi.fn()}>
        <p>Content</p>
      </Modal>,
    );
    expect(screen.getByText("Test Modal")).toBeInTheDocument();
  });

  it("renders children", () => {
    render(
      <Modal title="M" onClose={vi.fn()}>
        <p>Hello inside modal</p>
      </Modal>,
    );
    expect(screen.getByText("Hello inside modal")).toBeInTheDocument();
  });

  it("calls onClose when the X button is clicked", () => {
    const onClose = vi.fn();
    render(
      <Modal title="M" onClose={onClose}>
        <p>Content</p>
      </Modal>,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when the backdrop is clicked", () => {
    const onClose = vi.fn();
    const { container } = render(
      <Modal title="M" onClose={onClose}>
        <p>Content</p>
      </Modal>,
    );
    // backdrop is the absolute div behind the modal
    const backdrop = container.querySelector(".absolute.inset-0");
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("applies max-w-2xl when wide=true", () => {
    const { container } = render(
      <Modal title="M" onClose={vi.fn()} wide>
        <p />
      </Modal>,
    );
    expect(container.querySelector(".max-w-2xl")).toBeInTheDocument();
  });

  it("applies max-w-lg when wide is not set", () => {
    const { container } = render(
      <Modal title="M" onClose={vi.fn()}>
        <p />
      </Modal>,
    );
    expect(container.querySelector(".max-w-lg")).toBeInTheDocument();
  });

  it("calls onClose when Escape key is pressed on backdrop", () => {
    const onClose = vi.fn();
    const { container } = render(
      <Modal title="M" onClose={onClose}>
        <p>Content</p>
      </Modal>,
    );
    const backdrop = container.querySelector(".absolute.inset-0");
    fireEvent.keyDown(backdrop, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("does not call onClose for non-Escape keys on backdrop", () => {
    const onClose = vi.fn();
    const { container } = render(
      <Modal title="M" onClose={onClose}>
        <p>Content</p>
      </Modal>,
    );
    const backdrop = container.querySelector(".absolute.inset-0");
    fireEvent.keyDown(backdrop, { key: "Enter" });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("renders footer when footer prop is provided", () => {
    render(
      <Modal title="M" onClose={vi.fn()} footer={<button>Save</button>}>
        <p>Content</p>
      </Modal>,
    );
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("does not render footer section when footer prop is omitted", () => {
    const { container } = render(
      <Modal title="M" onClose={vi.fn()}>
        <p>Content</p>
      </Modal>,
    );
    expect(container.querySelector(".border-t")).not.toBeInTheDocument();
  });
});
