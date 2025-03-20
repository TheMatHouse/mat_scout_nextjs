import { NextResponse } from "next/server";

export const sendResponse = (message, statusCode = 200) => {
  return NextResponse.json({ message }, { status: statusCode });
};
