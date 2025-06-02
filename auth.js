import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import User from "@/models/userModel";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongo";
import { authConfig } from "./auth.config";
import { validateUsername } from "./lib/validation";

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  providers: [
    CredentialsProvider({
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials) {
        if (credentials === null) return null;
        try {
          await connectDB();
          const user = await User.findOne({ email: credentials.email });

          //const hashedPassword = await bcrypt.hash(credentials.password, 10);

          if (user) {
            const isMatch = await bcrypt.compare(
              credentials.password,
              user.password
            );

            if (isMatch) {
              return user;
            } else {
              throw new Error("Email or Password is not correct");
            }
          } else {
            throw new Error("User not found");
          }
        } catch (error) {
          throw new Error(error);
        }
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,

      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account.provider === "google") {
        try {
          const { name, email, image } = user;
          await connectDB();
          const userExists = await User.findOne({ email }).lean();
          if (userExists) {
            return userExists;
          }
          const nameArray = name.split(" ");
          let tempUsername;
          tempUsername =
            nameArray[0].toLowerCase() + nameArray[1].toLowerCase();
          let newUsername = await validateUsername(tempUsername);

          const newUser = new User({
            firstName: nameArray[0],
            lastName: nameArray[1],
            email: email,
            username: newUsername,
            googleAvatar: image,
            avatarType: "google",
          });
          const res = await newUser.save();
          if (res.status === 200 || res.status === 201) {
            return res;
          }
        } catch (err) {
          console.log(err);
        }
      }

      return user;
    },
    async jwt({ token, user }) {
      if (user) {
        const userInfo = await User.findOne({ email: user.email }).lean();
        token.userId = userInfo._id;
        token.email = userInfo.email;
        token.firstName = userInfo.firstName;
        token.lastName = userInfo.lastName;
        token.username = userInfo.username;
        token.avatar =
          userInfo.avatarType === "google"
            ? userInfo.googleAvatar
            : userInfo.avatar;
        token.avatarType = userInfo.avatarType;
        token.isAdmin = userInfo.isAdmin;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.userId = token.userId;
        session.user.email = token.email;
        session.user.firstName = token.firstName;
        session.user.lastName = token.lastName;
        session.user.username = token.username;
        session.user.avatar =
          token.avatarType === "googleAvatar"
            ? token.googleAvatar
            : token.avatar;
        session.user.avatarType = token.avatarType;
        session.user.isAdmin = token.isAdmin;
      }

      return session;
    },
  },
});
