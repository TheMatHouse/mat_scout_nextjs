"use client";

import DOMPurify from "dompurify";
import { useTeam } from "@/context/TeamContext";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import Countries from "@/assets/countries.json";

export default function TeamInfoDisplay() {
  const { team } = useTeam();
  if (!team) return null;

  const code2ToCountry = Object.fromEntries(Countries.map((c) => [c.code2, c]));

  const parsedPhone = parsePhoneNumberFromString(team.phone || "");
  const countryCode = parsedPhone?.country;
  const countryData = countryCode ? code2ToCountry[countryCode] : null;

  const displayPhone = parsedPhone
    ? `${countryData?.code3 || countryCode} (+${
        parsedPhone.countryCallingCode
      }) ${parsedPhone.formatNational()}`
    : team.phone || "";

  return (
    <div className="space-y-6 text-gray-900 dark:text-gray-100">
      {/* Description */}
      {team.info && (
        <div
          className="prose dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{
            __html: DOMPurify.sanitize(team.info),
          }}
        />
      )}

      {/* Contact Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {team.email && (
          <div>
            <p className="font-semibold">Email</p>
            <p>{team.email}</p>
          </div>
        )}

        {displayPhone && (
          <div>
            <p className="font-semibold">Phone</p>
            <p>{displayPhone}</p>
          </div>
        )}

        {team.address && (
          <div>
            <p className="font-semibold">Address</p>
            <p>
              {team.address}
              {team.address2 ? `, ${team.address2}` : ""}
            </p>
          </div>
        )}

        {(team.city || team.state || team.postalCode || team.country) && (
          <div>
            <p className="font-semibold">Location</p>
            <p>
              {team.city && `${team.city}, `}
              {team.state && `${team.state} `}
              {team.postalCode && `${team.postalCode} `}
              {team.country}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
