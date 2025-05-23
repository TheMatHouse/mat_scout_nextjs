"use client";

import { useEffect, useState } from "react";
import Countries from "@/assets/countries.json";

export default function useGeolocationCountry() {
  const [countryCode3, setCountryCode3] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`;
        fetch(url)
          .then((res) => res.json())
          .then((data) => {
            const code2 = data.address?.country_code?.toUpperCase();
            const matched = Countries.find((c) => c.code2 === code2);
            if (matched) {
              setCountryCode3(matched.code3);
            }
          })
          .catch(() => setCountryCode3(""))
          .finally(() => setLoading(false));
      },
      () => {
        setLoading(false);
      }
    );
  }, []);

  return { countryCode3, loading };
}
