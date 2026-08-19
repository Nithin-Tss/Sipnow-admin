import { X } from "lucide-react";

const SIZE_CLASSES = {
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-3xl",
  "2xl": "max-w-5xl",
};

export default function Modal({
  title,
  onClose,
  children,
  wide,
  size,
  footer,
}) {
  const sizeClass = SIZE_CLASSES[size ?? (wide ? "lg" : "md")];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40"
        role="none"
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
      />
      <div
        className={`relative bg-white border border-gray-200 rounded-xl shadow-lg w-full ${sizeClass} max-h-[90vh] flex flex-col`}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 shrink-0">
          <h3 className="text-sm font-semibold text-gray-900 min-w-0">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-4 py-3">{children}</div>
        {footer && (
          <div className="px-5 py-2.5 border-t border-gray-200 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
