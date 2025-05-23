import passport from "passport";
import { Strategy as FacebookStrategy } from "passport-facebook";
import { connectDB } from "@/config/mongo";
import User from "@/models/userModel";

passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
      callbackURL: process.env.FACEBOOK_CALLBACK_URL,
      profileFields: ["id", "emails", "name", "picture.type(large)"],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        await connectDB();

        const email =
          profile.emails?.[0]?.value || `fb-${profile.id}@facebook.com`;

        let user = await User.findOne({ email });

        if (!user) {
          user = await User.create({
            email,
            firstName: profile.name?.givenName || "FB",
            lastName: profile.name?.familyName || "User",
            username: `fb_${profile.id}`,
            password: null,
            avatar: profile.photos?.[0]?.value || "",
            googleAvatar: profile.photos?.[0]?.value || "",
            avatarType: "facebook",
            verified: true,
          });
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

export default passport;
