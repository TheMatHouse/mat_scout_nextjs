import { connectDB } from "@/lib/mongo";
import User from "@/models/userModel";

/**
 * Fetches a user from the database using their Clerk user ID.
 * @param {string} clerkId - The Clerk-provided user ID.
 * @returns {Promise<Object|null>} - The user document or null if not found.
 */
export async function getUserByClerkId(clerkId) {
  await connectDB();
  const user = await User.findOne({ clerkId });
  return user;
}
