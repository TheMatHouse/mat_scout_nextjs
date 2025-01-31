"use client";
import { useEffect, useState } from "react";
import Countries from "@/assets/countries.json";
import { useRouter } from "next/navigation";

const EditPersonalInfo = ({ user, userType, handleClose }) => {
  const router = useRouter();
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
  const [newCountry, setNewCountry] = useState(user.country || "");

  const [firstName, setFirstName] = useState(
    user?.firstName ? user.firstName : ""
  );
  const [lastName, setLastName] = useState(user?.lastName ? user.lastName : "");
  const [email, setEmail] = useState(user?.email ? user.email : "");
  const [city, setCity] = useState(user?.city ? user.city : myCity);
  const [state, setState] = useState(user?.state ? user.state : myState);
  const [country, setCountry] = useState(
    user?.country ? user.country : myCountry_code
  );
  const [gender, setGender] = useState(user?.gender ? user.gender : "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [allowPublic, setAllowPublic] = useState(
    user?.allowPublic ? user.allowPublic : ""
  );

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const formData = new FormData(e.currentTarget);

      const firstName = formData.get("firstName");
      const lastName = formData.get("lastName");
      const email = formData.get("email");
      const userId = formData.get("userId");
      const city = formData.get("city");
      const state = formData.get("state");
      const country = formData.get("country");

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_DOMAIN}/dashboard/${userId}`,
        {
          method: "PATCH",
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Content-type": "application/json; charset=UTF-8",
          },
          body: JSON.stringify({
            firstName,
            lastName,
            email,
            city,
            state,
            country,
            gender,
            allowPublic,
          }),
        }
      );

      router.refresh();
      handleClose();
    } catch (error) {
      console.log(error);
    }
  };
  return (
    <div>
      <h2 className="text-sm font-medium text-gray-900 dark:text-gray-100 border-b border-gray-300 py-3 px-4 mb-4 opacity-100">
        Edit personal info Modal
      </h2>
      <div className="px-4">
        <form
          onSubmit={handleSubmit}
          className="rounded px-8 pt-6 pb-2 mb-4"
        >
          <div className="md:flex md:items-center mb-6">
            <div className="md:w-1/3">
              <label
                className="block text-gray-900 dark:text-gray-100 text-lg font-bold md:text-right mb-1 md:mb-0 pr-4"
                htmlFor="firstName"
              >
                First Name
              </label>
            </div>
            <div className="md:w-2/3">
              <input
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-900 dark:text-gray-100 font-bold leading-tight focus:outline-ms-blue focus:shadow-outline"
                type="text"
                id="firstName"
                name="firstName"
                defaultValue={firstName}
                placeholder="First name"
              />
            </div>
          </div>

          <div className="md:flex md:items-center mb-6">
            <div className="md:w-1/3">
              <label
                className="block text-gray-900 dark:text-gray-100 text-lg font-bold md:text-right mb-1 md:mb-0 pr-4"
                htmlFor="lastName"
              >
                Last Name
              </label>
            </div>
            <div className="md:w-2/3">
              <input
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-900 dark:text-gray-100 font-bold leading-tight focus:outline-ms-blue focus:shadow-outline"
                type="text"
                id="lastName"
                name="lastName"
                placeholder="Last name"
                defaultValue={lastName}
              />
            </div>
          </div>

          <div className="md:flex md:items-center mb-6">
            <div className="md:w-1/3">
              <label
                className="block text-gray-900 dark:text-gray-100 text-lg font-bold md:text-right mb-1 md:mb-0 pr-4"
                htmlFor="email"
              >
                Email
              </label>
            </div>
            <div className="md:w-2/3">
              <input
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-900 dark:text-gray-100 font-bold leading-tight focus:outline-ms-blue focus:shadow-outline"
                type="email"
                id="email"
                name="email"
                placeholder="Email"
                defaultValue={email}
              />
            </div>
          </div>

          <div className="md:flex md:items-center mb-6">
            <div className="md:w-1/3">
              <label
                className="block text-gray-900 dark:text-gray-100 text-lg font-bold md:text-right mb-1 md:mb-0 pr-4"
                htmlFor="city"
              >
                City
              </label>
            </div>
            <div className="md:w-2/3">
              <input
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-900 dark:text-gray-100 font-bold leading-tight focus:outline-ms-blue focus:shadow-outline"
                type="text"
                id="city"
                name="city"
                placeholder="Last name"
                defaultValue={city}
              />
            </div>
          </div>
          <div className="md:flex md:items-center mb-6">
            <div className="md:w-1/3">
              <label
                className="block text-gray-900 dark:text-gray-100 text-lg font-bold md:text-right mb-1 md:mb-0 pr-4"
                htmlFor="state"
              >
                State
              </label>
            </div>
            <div className="md:w-2/3">
              <input
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-900 dark:text-gray-100 font-bold leading-tight focus:outline-ms-blue focus:shadow-outline"
                type="text"
                id="state"
                name="state"
                placeholder="Last name"
                defaultValue={state}
              />
            </div>
          </div>

          <div className="md:flex md:items-center mb-6">
            <div className="md:w-1/3">
              <label
                className="block text-gray-900 dark:text-gray-100 text-lg font-bold md:text-right mb-1 md:mb-0 pr-4"
                htmlFor="state"
              >
                State
              </label>
            </div>
            <div className="md:w-2/3">
              <select
                id="country"
                name="country"
                placeholder="Select country..."
                value={country}
                onChange={(e) => setCountry(e.target.value)}
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
          </div>

          <div className="flex fles-col md:flex md:items-center mb-6">
            <div className="md:w-1/3 flex justify-end">
              <legend>Gender</legend>
            </div>
            <div className="md:w-2/3 pl-4 ">
              <div className="flex items-center">
                <input
                  type="radio"
                  id="male"
                  name="gender"
                  value="Male"
                  checked={gender === "Male"}
                  onChange={(e) => setGender(e.target.value)}
                />
                <label
                  htmlFor="gender"
                  className="block text-gray-900 dark:text-gray-100 text-lg font-bold md:text-left mb-1 md:mb-0 pl-4"
                >
                  Male
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="radio"
                  id="female"
                  name="gender"
                  value="Female"
                  checked={gender === "Female"}
                  onChange={(e) => setGender(e.target.value)}
                />
                <label
                  htmlFor="gender"
                  className="block text-gray-900 dark:text-gray-100 text-lg font-bold md:text-left mb-1 md:mb-0 pl-4"
                >
                  Female
                </label>
              </div>
            </div>
          </div>

          <div className="md:flex md:items-center mb-6">
            <div className="md:w-1/3 flex justify-end">
              <input
                type="checkbox"
                name="allowPublic"
                checked={allowPublic}
                onChange={() => setAllowPublic((prev) => !prev)}
              />
            </div>
            <div className="md:w-2/3 pl-4">
              <label
                htmlFor="allowPublic"
                className="block text-gray-900 dark:text-gray-100 text-lg font-bold md:text-left mb-1 md:mb-0 pr-4"
              >
                Set profile to public
              </label>
            </div>
          </div>

          <input
            type="hidden"
            name="userId"
            defaultValue={user && user?._id}
          />
          <div className="flex items-center justify-between">
            <button
              className="bg-gray-900 hover:bg-gray-500  border-gray-500 dark:border-gray-100 border-2 drop-shadow-md text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              type="submit"
            >
              Update
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditPersonalInfo;
