// components/shared/FormField.jsx
"use client";

import clsx from "clsx";

const FormField = ({
  label,
  name,
  type = "text",
  value,
  defaultValue,
  onChange,
  placeholder,
  disabled,
  required,
  readOnly,
  autoComplete,
  className = "",
  inputClassName = "",
  children,
  ...rest
}) => {
  // Keep dangerous props off native elements
  const { dangerouslySetInnerHTML, ...safeRest } = rest;

  const hasChildren = children !== undefined && children !== null;

  // Controlled vs. uncontrolled handling (only for our own <input>)
  const valueProps = (() => {
    if (typeof onChange === "function") return { value: value ?? "", onChange };
    if (value !== undefined) {
      if (readOnly) return { value };
      return { defaultValue: value };
    }
    if (defaultValue !== undefined) return { defaultValue };
    return {};
  })();

  return (
    <div className={clsx("space-y-1", className)}>
      {label && (
        <label
          htmlFor={name}
          className="block text-sm font-medium"
        >
          {label}
        </label>
      )}

      {hasChildren ? (
        <div className={inputClassName}>{children}</div>
      ) : (
        <input
          id={name}
          name={name}
          type={type}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          readOnly={readOnly}
          autoComplete={autoComplete}
          className={clsx(
            "w-full rounded-md border px-3 py-2 bg-background",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-[var(--ms-light-red)]",
            inputClassName
          )}
          suppressHydrationWarning // ← guard against extension-injected attrs
          {...valueProps}
          {...safeRest}
        />
      )}
    </div>
  );
};

export default FormField;
