import { cookies } from "next/headers";

export async function fetchUserProfile() {
  const user = await currentUser();
  const userId = user?.publicMetadata?.userMongoId;
  const sessionCookie = cookies().get("__session")?.value;

  if (!userId || !sessionCookie) {
    throw new Error("Missing user ID or session cookie");
  }

  const token = await getToken({ cookie: `__session=${sessionCookie}` });

  if (!token) {
    throw new Error("Failed to extract token from Clerk session");
  }

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_DOMAIN}/dashboard/${userId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch user profile – status ${res.status}`);
  }

  const data = await res.json();
  return data?.user;
}
