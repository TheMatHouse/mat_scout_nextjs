import User from "@/models/userModel";
import { connectDB } from "@/config/mongo";

export const createOrUpdateUser = async (
  id,
  first_name,
  last_name,
  image_url,
  email_addresses,
  username
) => {
  try {
    await connectDB();
    const userExists = await User.findOneAndUpdate({
      email: email_addresses[0].email_address,
    });

    if (userExists && !userExists.clerkId) {
      const addClerk = await User.findOneAndUpdate(
        {
          email: email_addresses[0].email_address,
        },
        {
          $set: {
            clerkId: id,
          },
        }
      );
    }
    const user = await User.findOneAndUpdate(
      { clerkId: id },
      {
        $set: {
          firstName: first_name,
          lastName: last_name,
          avatar: image_url,
          email: email_addresses[0].email_address,
          username,
        },
      },
      { new: true, upsert: true }
    );
    return user;
  } catch (error) {
    console.log("Error creating or updating user:", error);
  }
};

export const deleteUser = async (id) => {
  try {
    await connectDB();
    await User.findOneAndDelete({ clerkId: id });
  } catch (error) {
    console.log("Error deleting user:", error);
  }
};
