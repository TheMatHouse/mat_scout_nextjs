import { connectDB } from "@/lib/mongo";
import { getCurrentUserFromCookies } from "@/lib/auth-server";
import Team from "@/models/teamModel";
import TeamMember from "@/models/teamMemberModel";

export async function PATCH(request, context) {
  await connectDB();

  const { slug } = await context.params;
  const currentUser = await getCurrentUserFromCookies();

  if (!currentUser) {
    return new Response("Unauthorized", { status: 401 });
  }

  const team = await Team.findOne({ teamSlug: slug });
  if (!team) {
    return new Response("Team not found", { status: 404 });
  }

  const member = await TeamMember.findOne({
    teamId: team._id,
    userId: currentUser._id,
  });

  // ✅ Only allow "manager" role to update
  if (!member || member.role !== "manager") {
    return new Response("Forbidden", { status: 403 });
  }

  try {
    const body = await request.json();

    const fieldsToUpdate = {
      info: body.info || "",
      email: body.email || "",
      phone: body.phone || "",
      address: body.address || "",
      address2: body.address2 || "",
      city: body.city || "",
      state: body.state || "",
      postalCode: body.postalCode || "",
      country: body.country || "",
    };

    Object.assign(team, fieldsToUpdate);
    await team.save();

    return Response.json({ success: true, team });
  } catch (error) {
    console.error("Error updating team:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
