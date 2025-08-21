// lib/cloudinary.js
import { v2 as cloudinary } from "cloudinary";

const cloud_name = process.env.CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME;
const api_key = process.env.CLOUD_KEY || process.env.CLOUDINARY_API_KEY;
const api_secret =
  process.env.CLOUD_SECRET || process.env.CLOUDINARY_API_SECRET;

if (!cloud_name || !api_key || !api_secret) {
  throw new Error("Cloudinary env vars missing (CLOUD_NAME/KEY/SECRET).");
}

cloudinary.config({ cloud_name, api_key, api_secret });
export default cloudinary;
