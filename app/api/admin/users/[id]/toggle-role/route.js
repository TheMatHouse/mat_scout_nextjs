import { connectDB } from "@/lib/mongo";
import User from "@/models/userModel";
import { getCurrentUser } from "@/lib/auth-server";

export async function POST(req, { params }) {
  await connectDB();
  const { id } = params;

  const currentUser = await getCurrentUser();
  if (!currentUser || !currentUser.isAdmin) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 403,
    });
  }

  const user = await User.findById(id);
  if (!user) {
    return new Response(JSON.stringify({ error: "User not found" }), {
      status: 404,
    });
  }

  user.isAdmin = !user.isAdmin;
  await user.save();

  return new Response(JSON.stringify({ message: "Role updated" }), {
    status: 200,
  });
}
