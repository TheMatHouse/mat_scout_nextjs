"use client";

import Select from "react-select";

export default function FormMultiSelect({
  label,
  value,
  onChange,
  options,
  placeholder = "Select options...",
}) {
  return (
    <div>
      {label && (
        <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <Select
        isMulti
        options={options}
        value={options.filter((opt) =>
          value.some(
            (v) =>
              v.athleteId === opt.value && v.athleteType === opt.athleteType
          )
        )}
        onChange={(selected) =>
          onChange(
            selected.map((opt) => ({
              athleteId: opt.value,
              athleteType: opt.athleteType,
            }))
          )
        }
        placeholder={placeholder}
        className="mt-1"
        styles={{
          control: (base, state) => ({
            ...base,
            backgroundColor: "#0f172a",
            borderColor: state.isFocused ? "#3b82f6" : "#334155",
            color: "#f8fafc",
            boxShadow: "none",
            ":hover": { borderColor: "#3b82f6" },
          }),
          menu: (base) => ({
            ...base,
            backgroundColor: "#1e293b",
            color: "#f8fafc",
          }),
          option: (base, state) => ({
            ...base,
            backgroundColor: state.isFocused ? "#334155" : "#1e293b",
            color: "#f8fafc",
            ":active": { backgroundColor: "#3b82f6" },
          }),
          multiValue: (base) => ({
            ...base,
            backgroundColor: "#334155",
            color: "#f8fafc",
          }),
          multiValueLabel: (base) => ({ ...base, color: "#f8fafc" }),
          multiValueRemove: (base) => ({
            ...base,
            color: "#f8fafc",
            ":hover": { backgroundColor: "#3b82f6", color: "white" },
          }),
          input: (base) => ({ ...base, color: "#f8fafc" }),
          singleValue: (base) => ({ ...base, color: "#f8fafc" }),
        }}
      />
    </div>
  );
}
