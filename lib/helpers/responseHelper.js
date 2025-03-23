import { NextResponse } from "next/server";

export const sendResponse = (data, statusCode = 200) => {
  // Ensure data is always an object
  if (typeof data === "string") {
    return NextResponse.json({ message: data }, { status: statusCode });
  }

  // If data is already an object, return as-is
  return NextResponse.json(data, { status: statusCode });
};
