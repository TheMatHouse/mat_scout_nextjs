/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      "graph.facebook.com", // Facebook avatars
      "lh3.googleusercontent.com", // Google avatars
      "res.cloudinary.com", // Cloudinary uploads (including your default avatar)
    ],
  },
};

export default nextConfig;
