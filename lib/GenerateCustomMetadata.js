import { customMetaDataGenerator } from "./CustomMetaDataGenerator";

export async function generateMetadata({ profile }) {
  //const userInfo = useGetProfileByUsernameQuery(username);

  //const profile = userInfo?.data[0] && userInfo?.data[0];
  if (!profile) {
    return customMetaDataGenerator({
      title: "Profile Not Found | MatScout",
    });
  }
  // Generate the metadata using the fetched post data
  return customMetaDataGenerator({
    title: `${profile.firstName} ${profile.lastName}!`,
    description: `${profile.firstName} ${profile.lastName}'s MatScout profile`,
    ogImage:
      profile.avatarType === "google" ? profile.googleAvatar : profile.avatar,
    keywords: ["grappling"],
    canonicalUrl: `https://matscout.com/${profile.username}`,
  });
}
