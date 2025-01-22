"use server";
import { NextResponse } from "next/server";
import { Types } from "mongoose";
import UserStyle from "@/models/userStyleModel";
import { connectDB } from "@/config/mongo";
