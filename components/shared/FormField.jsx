// components/shared/FormField.jsx
"use client";

export default function FormField({
  label,
  name,
  type = "text",
  value,
  onChange,
  placeholder,
  disabled,
  required,
  autoComplete, // ← pass-through
  ...rest
}) {
  return (
    <div className="space-y-1">
      {label && (
        <label
          htmlFor={name}
          className="block text-sm font-medium"
        >
          {label}
        </label>
      )}
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        autoComplete={autoComplete} // ← don’t force "off"
        className="w-full rounded-md border px-3 py-2 bg-background"
        {...rest}
      />
    </div>
  );
}
