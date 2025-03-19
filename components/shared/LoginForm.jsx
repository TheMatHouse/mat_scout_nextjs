"use client";
import { doCredentialLogin, doSocialLogin } from "@/app/actions";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
// ICONS
import { FcGoogle } from "react-icons/fc";

const LoginForm = () => {
  /* START HYDRATION FAILURE FIX */
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  /* END HYDRATION FAILURE FIX */
  const router = useRouter();

  //const dispatch = useDispatch();
  // const router = useRouter();

  //const [login, { isLoading }] = useLoginMutation();

  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const formData = new FormData(e.currentTarget);
      const response = await doCredentialLogin(formData);

      if (!!response?.error) {
        setError(response?.error.message);
      } else {
        router.push("/dashboard");
      }

      // const email = formData.get("email");
      // const password = formData.get("password");

      // const res = await login({ email, password });

      // dispatch(setCredentials({ ...res }));
      // console.log(setCredentials);
      // console.log("res ", res);

      // if (!!res.error) {
      //   setError("Please check your credentials!");
      // } else {
      //   setError("");
      //   router.push(`/${res.data.username}`);
      // }
      // if (!!res.error) {
      //   setError(res.error.message);
      // } else {
      //   router.push("/");
      // }
    } catch (err) {
      console.log(err);
      setError("Please check your credentials!");
    }
  };
  return (
    isClient && (
      <div className="w-full max-w-lg bg-gray-200 dark:bg-gray-300 shadow-md">
        <h1 className="text-3xl my-3 text-center text-gray-900">Sign In</h1>
        <div className="text-xl text-red-500">{error}</div>
        <form
          onSubmit={handleSubmit}
          className="rounded px-8 pt-6 pb-8 mb-4"
        >
          <div className="md:flex md:items-center mb-6">
            <div className="md:w-1/3">
              <label
                className="block text-gray-100 dark:text-gray-900 text-lg font-bold md:text-right mb-1 md:mb-0 pr-4"
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
                placeholder="Email address"
              />
            </div>
          </div>
          <div className="md:flex md:items-center mb-6">
            <div className="md:w-1/3">
              <label
                className="block text-gray-100 dark:text-gray-900 text-lg font-bold md:text-right mb-1 md:mb-0 pr-4"
                htmlFor="password"
              >
                Password
              </label>
            </div>
            <div className="md:w-2/3">
              <input
                type="password"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-900 dark:text-gray-100 font-bold leading-tight focus:outline-ms-blue focus:shadow-outline"
                id="password"
                name="password"
                placeholder="Password"
              />
            </div>
          </div>
          <div className="md:flex md:items-center mb-6">
            <div className="md:w-1/3"></div>
          </div>
          <div className="md:flex md:items-center">
            <div className="md:w-1/3"></div>
          </div>
          <div className="flex items-center justify-between">
            <button
              className="bg-gray-900 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              type="submit"
            >
              Sign In
            </button>
            <a
              className="inline-block align-baseline font-bold text-sm text-gray-900 hover:text-ms-blue"
              href="#"
            >
              Forgot Password?
            </a>
          </div>

          <p className="my-3 text-center text-gray-900 text-sm font-bold">
            {`Don't have an account?`}
            <Link
              href="/register"
              className="mx-2 underline"
            >
              Register
            </Link>
          </p>
        </form>
        <form action={doSocialLogin}>
          <div className="flex justify-center mb-2">
            <button
              type="submit"
              name="action"
              value="google"
              className="google_btn mb-2 p-2 rounded text-uppercase flex justify-center items-center text-gray-900 font-bold text-lg"
            >
              <FcGoogle
                size={32}
                className="mr-2"
              />{" "}
              Sign in with Google
            </button>
          </div>
        </form>
      </div>
    )
  );
};

export default LoginForm;
