import User from "@/models/userModel";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  const { id } = params;
  console.log("ID ", id);
  const user = await User.findById({ clerkId: id }).select("-password -tokens");

  return new NextResponse(user);
}
