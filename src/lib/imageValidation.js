// Exact required dimensions for each upload slot
export const PRODUCT_IMAGE = {
  width: 1024,
  height: 1280,
  label: "product image",
};
export const OFFER_BANNER = {
  width: 1200,
  height: 300,
  label: "offer banner",
};

const TOLERANCE = 0.05; // 5% — allows slight rounding without being too strict

export function validateImage(file, spec) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const expectedRatio = spec.width / spec.height;
      const actualRatio = w / h;

      if (w < spec.width || h < spec.height) {
        resolve(
          `Image too small: ${w}×${h} px. Required minimum is ${spec.width}×${spec.height} px.`,
        );
        return;
      }

      if (Math.abs(actualRatio - expectedRatio) / expectedRatio > TOLERANCE) {
        const required = `${spec.width}:${spec.height}`;
        const actual = `${w}:${h}`;
        resolve(
          `Wrong aspect ratio (${actual}). ${spec.label[0].toUpperCase()}${spec.label.slice(1)}s must be ${required} (${spec.width}×${spec.height} px or proportionally larger).`,
        );
        return;
      }

      resolve(null);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve("Could not read the image file.");
    };

    img.src = url;
  });
}
