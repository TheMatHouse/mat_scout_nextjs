"use client";

export default function FormField({
  label,
  name,
  type = "text",
  value,
  onChange,
  placeholder = "",
  disabled = false,
  error = "",
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="block mb-1 font-medium"
      >
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className="form-control"
      />
      {error && <p className="text-error">{error}</p>}
    </div>
  );
}
