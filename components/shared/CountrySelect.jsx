// components/shared/CountrySelect.jsx
"use client";

import { buildCountryOptions } from "@/lib/buildCountryOptions";
import FormSelect from "@/components/shared/FormSelect";

export default function CountrySelect({
  label = "Country",
  value,
  onChange,
  placeholder = "Select country...",
  required = false,
  disabled = false,
  className = "",
}) {
  const opts = buildCountryOptions(); // includes pinned + divider + full list

  return (
    <FormSelect
      label={label}
      value={value}
      onChange={onChange}
      options={opts}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      className={className}
    />
  );
}
