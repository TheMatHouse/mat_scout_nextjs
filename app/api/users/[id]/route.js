import User from "@/models/userModel";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  const { id } = params;

  const user = await User.findById(id).select("-password -tokens");

  return new NextResponse(user);
}
