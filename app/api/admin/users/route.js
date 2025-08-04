import { connectDB } from "@/lib/mongo";
import User from "@/models/userModel";
import { getCurrentUser } from "@/lib/auth-server";

export async function GET(req) {
  await connectDB();

  const user = await getCurrentUser();
  if (!user || !user.isAdmin) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 403,
    });
  }

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q") || "";

  const filter = query
    ? {
        $or: [
          { firstName: { $regex: query, $options: "i" } },
          { lastName: { $regex: query, $options: "i" } },
          { email: { $regex: query, $options: "i" } },
          { username: { $regex: query, $options: "i" } },
        ],
      }
    : {};

  const users = await User.find(filter)
    .sort({ createdAt: -1 })
    .select("-password");

  return new Response(JSON.stringify({ users }), { status: 200 });
}
