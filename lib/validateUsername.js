// lib/validateUsername.js
import User from "@/models/userModel";

export const validateUsername = async (username) => {
  let exists;
  do {
    const check = await User.findOne({ username });
    if (check) {
      username += Math.floor(Math.random() * 10);
      exists = true;
    } else {
      exists = false;
    }
  } while (exists);
  return username;
};
