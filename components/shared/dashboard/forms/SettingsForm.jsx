"user client";

import React, { useEffect, useState } from "react";
import { AlertDialog } from "@/components/ui/alert-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Countries from "@/assets/countries.json";

const SettingsForm = ({ user }) => {
  console.log(user?.country);
  // get user's current location

  useEffect(() => {
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude, longitude } = pos.coords;

      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`;
      fetch(url)
        .then((res) => res.json())
        .then((data) => setAdd(data.address));
    });
  }, []);

  const [add, setAdd] = useState("");
  // get the current country to match user's current country
  const myCountry_code = add?.country_code;

  const myCountry = Countries.filter(
    (country) => country.code2.toLowerCase() === myCountry_code
  );

  const Country = myCountry[0]?.code3;
  const [newCountry, setNewCountry] = useState(
    user?.country ? user?.country : ""
  );

  const [city, setCity] = useState(user?.city ? user.city : "");
  const [state, setState] = useState(user?.state ? user.state : "");
  const [country, setCountry] = useState(
    user?.country ? user.country : myCountry_code
  );
  const [allowPublic, setAllowPublic] = useState(
    user?.allowPublic ? user.allowPublic : "Private"
  );
  const handleSubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const allowPublic = formData.get("allowPublic");

    try {
    } catch (error) {}
  };
  return (
    <AlertDialog>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Privacy Settings</CardTitle>
          <CardDescription>Update your privacy settings</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit}
            className="rounded px-8 pb-2 mb-4 space-y-4"
          >
            {/* City */}
            <div className="flex items-center gap-4">
              <label
                htmlFor="city"
                className="w-32 text-right text-lg font-bold text-gray-900 dark:text-gray-100"
              >
                City:
              </label>
              <input
                id="city"
                name="city"
                type="text"
                placeholder="City"
                defaultValue={city}
                className="flex-1 shadow appearance-none border rounded py-2 px-3 text-gray-900 dark:text-gray-100 font-bold leading-tight focus:outline-ms-blue focus:shadow-outline"
              />
            </div>

            {/* State */}
            <div className="flex items-center gap-4">
              <label
                htmlFor="state"
                className="w-32 text-right text-lg font-bold text-gray-900 dark:text-gray-100"
              >
                State:
              </label>
              <input
                id="state"
                name="state"
                type="text"
                placeholder="State"
                defaultValue={state}
                className="flex-1 shadow appearance-none border rounded py-2 px-3 text-gray-900 dark:text-gray-100 font-bold leading-tight focus:outline-ms-blue focus:shadow-outline"
              />
            </div>

            {/* Country */}
            <div className="flex items-center gap-4">
              <label
                htmlFor="country"
                className="w-32 text-right text-lg font-bold text-gray-900 dark:text-gray-100"
              >
                Country:
              </label>
              <select
                id="country"
                name="country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="flex-1 shadow appearance-none border rounded py-2 px-3 text-gray-900 dark:text-gray-100 font-bold leading-tight focus:outline-ms-blue focus:shadow-outline"
              >
                <option value="">Select country...</option>
                {Countries.map((country) => (
                  <option
                    key={country.code3}
                    value={country.code3}
                  >
                    {country.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Profile Privacy */}
            <div className="flex items-start gap-4">
              <label className="w-32 text-right text-lg font-bold text-gray-900 dark:text-gray-100 pt-1">
                Profile Privacy:
              </label>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-gray-900 dark:text-gray-100 text-lg font-bold">
                  <input
                    type="radio"
                    id="public"
                    name="allowPublic"
                    value="Public"
                    checked={allowPublic === "Public"}
                    onChange={(e) => setAllowPublic(e.target.value)}
                  />
                  Public
                </label>
                <label className="flex items-center gap-2 text-gray-900 dark:text-gray-100 text-lg font-bold">
                  <input
                    type="radio"
                    id="private"
                    name="allowPublic"
                    value="Private"
                    checked={allowPublic === "Private"}
                    onChange={(e) => setAllowPublic(e.target.value)}
                  />
                  Private
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-center pt-4">
              <Button type="submit">Update Privacy Settings</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </AlertDialog>
  );
};

export default SettingsForm;
