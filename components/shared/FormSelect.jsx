// components/shared/FormSelect.jsx
"use client";

export default function FormSelect({
  label,
  name,
  value,
  onChange,
  options = [], // [{ value, label }]
  placeholder = "Select…",
  disabled = false,
  required = false,
  className = "",
}) {
  const handleChange = (e) => onChange?.(e.target.value);

  return (
    <div className={`mb-4 ${className}`}>
      {label && (
        <label
          htmlFor={name}
          className="block text-sm font-medium mb-2 text-[var(--color-text)]"
        >
          {label}
        </label>
      )}

      <select
        id={name}
        name={name}
        value={value ?? ""} // keep it empty until user picks
        onChange={handleChange}
        disabled={disabled}
        required={required}
        className="w-full rounded-md border px-3 py-2 text-sm bg-[var(--color-card)] text-[var(--color-text)] shadow-sm transition focus:outline-none focus:ring-1 focus:border-[var(--color-border)] focus:ring-[var(--color-border)] disabled:opacity-60"
      >
        <option value="">{placeholder}</option>

        {options.map((opt) => (
          <option
            key={String(opt.value)}
            value={opt.value}
          >
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
