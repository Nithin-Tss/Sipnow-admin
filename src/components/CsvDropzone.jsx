import { useRef } from "react";
import { Upload } from "lucide-react";

export default function CsvDropzone({
  onFileSelect,
  disabled,
  label = "Click to select CSV file",
  disabledLabel = "Select a supplier first",
}) {
  const inputRef = useRef(null);

  return (
    <button
      type="button"
      disabled={disabled}
      className={`w-full border-2 border-dashed p-8 text-center ${
        disabled
          ? "border-gray-200 bg-gray-50 cursor-not-allowed opacity-60"
          : "border-gray-300 cursor-pointer hover:bg-gray-50"
      }`}
      onClick={() => inputRef.current?.click()}
    >
      <Upload size={24} className="mx-auto text-gray-300 mb-2" />
      <p className="text-sm text-gray-500">
        {disabled ? disabledLabel : label}
      </p>
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) onFileSelect(file);
        }}
      />
    </button>
  );
}
