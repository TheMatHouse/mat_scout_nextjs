import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/context/UserContext";

export default function LogoutButton() {
  const router = useRouter();
  const { logout } = useCurrentUser();

  const handleLogout = async () => {
    await logout(); // ✅ Clears context and server cookie
    router.push("/"); // ✅ Redirect to homepage
  };

  return (
    <button
      onClick={handleLogout}
      className="text-ms-light-red hover:text-ms-dark-red font-semibold px-4 py-2"
    >
      Logout
    </button>
  );
}
