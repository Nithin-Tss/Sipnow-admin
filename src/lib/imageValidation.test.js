import { describe, it, expect, vi, beforeEach } from "vitest";
import { validateImage, PRODUCT_IMAGE, OFFER_BANNER } from "./imageValidation";

// Vitest/jsdom doesn't implement URL.createObjectURL
vi.stubGlobal("URL", {
  createObjectURL: vi.fn(() => "blob:mock-url"),
  revokeObjectURL: vi.fn(),
});

function makeFile(name = "test.jpg", type = "image/jpeg") {
  return new File([""], name, { type });
}

function stubImage(width, height, error = false) {
  vi.stubGlobal(
    "Image",
    class {
      naturalWidth = width;
      naturalHeight = height;
      onload = null;
      onerror = null;
      set src(_) {
        setTimeout(() => (error ? this.onerror?.() : this.onload?.()), 0);
      }
    },
  );
}

describe("PRODUCT_IMAGE spec", () => {
  it("requires 1024×1280", () => {
    expect(PRODUCT_IMAGE.width).toBe(1024);
    expect(PRODUCT_IMAGE.height).toBe(1280);
  });
});

describe("OFFER_BANNER spec", () => {
  it("requires 1200×300", () => {
    expect(OFFER_BANNER.width).toBe(1200);
    expect(OFFER_BANNER.height).toBe(300);
  });
});

describe("validateImage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns null for a valid product image (1024×1280)", async () => {
    stubImage(1024, 1280);
    const result = await validateImage(makeFile(), PRODUCT_IMAGE);
    expect(result).toBeNull();
  });

  it("returns null for a larger proportional image (2048×2560)", async () => {
    stubImage(2048, 2560);
    const result = await validateImage(makeFile(), PRODUCT_IMAGE);
    expect(result).toBeNull();
  });

  it("returns an error when image is too small", async () => {
    stubImage(400, 400);
    const result = await validateImage(makeFile(), PRODUCT_IMAGE);
    expect(result).toContain("too small");
    expect(result).toContain("400×400");
  });

  it("returns an error for wrong aspect ratio", async () => {
    // 2048×2048 is large enough (both dims >= 1024/1280) but ratio 1:1 ≠ 4:5
    stubImage(2048, 2048);
    const result = await validateImage(makeFile(), PRODUCT_IMAGE);
    expect(result).toContain("aspect ratio");
  });

  it("returns an error when image fails to load", async () => {
    stubImage(0, 0, true);
    const result = await validateImage(makeFile(), PRODUCT_IMAGE);
    expect(result).toContain("Could not read");
  });

  it("returns null for a valid offer banner (1200×300)", async () => {
    stubImage(1200, 300);
    const result = await validateImage(makeFile(), OFFER_BANNER);
    expect(result).toBeNull();
  });
});
