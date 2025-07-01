"use client";

import { parsePhoneNumberFromString } from "libphonenumber-js";

export default function FormattedPhone({ number }) {
  if (!number) return null;

  const phoneNumber = parsePhoneNumberFromString(number);
  if (!phoneNumber || !phoneNumber.isValid()) return <span>{number}</span>;

  const countryCode = phoneNumber.country; // e.g. 'US'
  const flag = countryCode
    ? String.fromCodePoint(
        ...[...countryCode].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)
      )
    : "";

  return (
    <span>
      {flag} {phoneNumber.formatInternational()}
    </span>
  );
}
