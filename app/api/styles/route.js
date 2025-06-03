import { NextResponse } from "next/server";
import Style from "@/models/styleModel";
import { connectDB } from "@/lib/mongo";

export const GET = async () => {
  try {
    await connectDB();
    const styles = await Style.find();
    return NextResponse.json(styles, { status: 200 });
  } catch (error) {
    return new NextResponse("Error fetching styles " + error.message, {
      status: 500,
    });
  }
};
