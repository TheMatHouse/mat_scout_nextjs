// app/users/page.jsx
import UsersDirectory from "@/components/directory/UsersDirectory";

export const dynamic = "force-dynamic";

export default function UsersPage() {
  return <UsersDirectory />;
}
