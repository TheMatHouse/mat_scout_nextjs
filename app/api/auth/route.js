"use server";
import { NextResponse } from "next/server";
import { User } from "@/models/userModel";
import bcrypt from "bcryptjs";
import { connectDB } from "@/config/mongo";
import { validateUsername } from "@/lib/validation";
import { generateEmailToken } from "@/lib/generateToken";
import { EmailVerificationToken } from "@/models/emailVerificationToken";
import { sendVerificationEmail } from "@/lib/mail";

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      firstName,
      lastName,
      email,
      password,
      city,
      state,
      country,
      allowPublic,
    } = body;

    await connectDB();
    const userExists = await User.findOne({ email });

    if (userExists) {
      return new NextResponse(
        JSON.stringify({
          message: "A user with this email address already exists.",
          staths: 400,
        })
      );
    }

    let tempUsername = firstName.toLowerCase() + lastName.toLowerCase();
    let newUsername = await validateUsername(tempUsername);

    // encrypt password
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      firstName,
      lastName,
      email,
      city,
      state,
      country,
      username: newUsername,
      allowPublic,
      password: hashedPassword,
    });

    if (newUser) {
      // send verification email
      const token = generateEmailToken(NextResponse, newUser._id);

      const newToken = await EmailVerificationToken.create({
        owner: newUser._id,
        token,
      });

      const link = `${process.env.VERIFY_EMAIL_LINK}?token=${newToken.token}&userId=${newUser._id}`;

      sendVerificationEmail(token, link, {
        firstName,
        email,
      });

      return new NextResponse(
        JSON.stringify({
          message: "Account created successfully.  Please log in.",
          status: 201,
        })
      );
    } else {
      return new NextResponse.json("Error creating user ", {
        status: 500,
      });
    }
  } catch (error) {
    return new NextResponse(
      JSON.stringify({
        message: "Error creating user " + error.message,
        status: 500,
      })
    );
  }
}
