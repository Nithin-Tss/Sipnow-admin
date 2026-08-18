import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { api, saveToken, clearToken, getToken } from "./api";

describe("saveToken / clearToken / getToken", () => {
  afterEach(() => localStorage.clear());

  it("saves and retrieves a token", () => {
    saveToken("abc123");
    expect(getToken()).toBe("abc123");
  });

  it("clears the token", () => {
    saveToken("abc123");
    clearToken();
    expect(getToken()).toBeNull();
  });

  it("returns null when no token is stored", () => {
    expect(getToken()).toBeNull();
  });
});

describe("api.get", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ id: 1 }),
      }),
    );
    localStorage.clear();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("calls fetch with the full API path", async () => {
    await api.get("/products");
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/products"),
      expect.any(Object),
    );
  });

  it("includes Authorization header when a token is stored", async () => {
    saveToken("my-token");
    await api.get("/products");
    const [, opts] = vi.mocked(fetch).mock.calls[0];
    expect(opts?.headers["Authorization"]).toBe("Bearer my-token");
  });

  it("omits Authorization header when no token is stored", async () => {
    await api.get("/products");
    const [, opts] = vi.mocked(fetch).mock.calls[0];
    expect(opts?.headers["Authorization"]).toBeUndefined();
  });

  it("throws when response is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ message: "Bad request" }),
      }),
    );
    await expect(api.get("/bad")).rejects.toThrow("Bad request");
  });

  it("returns undefined for 204 No Content", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({ ok: true, status: 204, json: async () => ({}) }),
    );
    const result = await api.delete("/item/1");
    expect(result).toBeUndefined();
  });

  it("throws a default message when the error response has none", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }),
    );
    await expect(api.get("/bad")).rejects.toThrow("Request failed (500)");
  });

  it("sends a JSON body for post/patch/put", async () => {
    await api.post("/products", { name: "Wine" });
    const [, postOpts] = vi.mocked(fetch).mock.calls[0];
    expect(postOpts?.method).toBe("POST");
    expect(postOpts?.body).toBe(JSON.stringify({ name: "Wine" }));

    await api.patch("/products/1", { name: "Beer" });
    const [, patchOpts] = vi.mocked(fetch).mock.calls[1];
    expect(patchOpts?.method).toBe("PATCH");

    await api.put("/products/1", { name: "Cider" });
    const [, putOpts] = vi.mocked(fetch).mock.calls[2];
    expect(putOpts?.method).toBe("PUT");
  });

  it("omits Content-Type when uploading FormData", async () => {
    const form = new FormData();
    form.append("file", "data");
    await api.upload("/products/import", form);
    const [, opts] = vi.mocked(fetch).mock.calls[0];
    expect(opts?.method).toBe("POST");
    expect(opts?.body).toBe(form);
    expect(opts?.headers["Content-Type"]).toBeUndefined();
  });
});

describe("api.getBlob", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("returns the blob when the response is ok", async () => {
    const blob = new Blob(["data"]);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, blob: async () => blob }),
    );
    const result = await api.getBlob("/export.csv");
    expect(result).toBe(blob);
  });

  it("includes Authorization header when a token is stored", async () => {
    saveToken("my-token");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, blob: async () => new Blob() }),
    );
    await api.getBlob("/export.csv");
    const [, opts] = vi.mocked(fetch).mock.calls[0];
    expect(opts?.headers["Authorization"]).toBe("Bearer my-token");
  });

  it("throws using the error message when the response is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ message: "Export failed" }),
      }),
    );
    await expect(api.getBlob("/export.csv")).rejects.toThrow("Export failed");
  });

  it("throws a default message when json parsing fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error("invalid json");
        },
      }),
    );
    await expect(api.getBlob("/export.csv")).rejects.toThrow(
      "Request failed (500)",
    );
  });
});
