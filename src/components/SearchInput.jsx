import { Search } from "lucide-react";

export default function SearchInput({
  value,
  onChange,
  placeholder,
  className = "",
  autoFocus,
  id,
  onFocus,
}) {
  return (
    <div className={`relative ${className}`}>
      <Search
        size={13}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
      />
      <input
        id={id}
        type="text"
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-300 pl-8 pr-3 py-1 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/10"
      />
    </div>
  );
}
