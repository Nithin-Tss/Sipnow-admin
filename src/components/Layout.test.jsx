import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Layout from "./Layout";

vi.mock("./Sidebar", () => ({
  default: ({ collapsed, onToggle }) => (
    <div data-testid="sidebar" data-collapsed={String(collapsed)}>
      <button onClick={onToggle}>toggle</button>
    </div>
  ),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    Outlet: () => <div data-testid="outlet">outlet content</div>,
  };
});

beforeEach(() => {
  localStorage.clear();
});

describe("Layout", () => {
  it("renders sidebar and outlet", () => {
    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("sidebar")).toBeInTheDocument();
    expect(screen.getByTestId("outlet")).toBeInTheDocument();
  });

  it("reads initial collapsed state from localStorage (not collapsed)", () => {
    localStorage.setItem("sipnow_sb_col", "0");
    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("sidebar").getAttribute("data-collapsed")).toBe(
      "false",
    );
  });

  it("reads initial collapsed state from localStorage (collapsed)", () => {
    localStorage.setItem("sipnow_sb_col", "1");
    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("sidebar").getAttribute("data-collapsed")).toBe(
      "true",
    );
  });

  it("toggles collapsed state when toggle is clicked", () => {
    localStorage.removeItem("sipnow_sb_col");
    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>,
    );
    const sidebar = screen.getByTestId("sidebar");
    expect(sidebar.getAttribute("data-collapsed")).toBe("false");
    fireEvent.click(screen.getByText("toggle"));
    expect(sidebar.getAttribute("data-collapsed")).toBe("true");
  });

  it("persists collapsed state to localStorage on toggle", () => {
    localStorage.removeItem("sipnow_sb_col");
    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByText("toggle"));
    expect(localStorage.getItem("sipnow_sb_col")).toBe("1");
  });

  it("toggles back from collapsed to expanded", () => {
    localStorage.setItem("sipnow_sb_col", "1");
    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByText("toggle"));
    expect(screen.getByTestId("sidebar").getAttribute("data-collapsed")).toBe(
      "false",
    );
    expect(localStorage.getItem("sipnow_sb_col")).toBe("0");
  });
});
