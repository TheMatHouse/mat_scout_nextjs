import { User } from "@/models/userModel.js";
//import Team from "../models/teamModel.js";

export const validateUsername = async (username) => {
  let a = false;

  do {
    let check = await User.findOne({ username });
    if (check) {
      username += (+new Date() * Math.random()).toString().substring(0, 1);
      a = true;
    } else {
      a = false;
    }
  } while (a);
  return username;
};

export const validateTeamSlug = async (teamSlug) => {
  let a = false;

  do {
    let check = await Team.findOne({ teamSlug });
    if (check) {
      teamSlug += (+new Date() * Math.random()).toString().substring(0, 1);
      a = true;
    } else {
      a = false;
    }
  } while (a);
  return teamSlug;
};
