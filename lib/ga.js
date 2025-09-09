// lib/ga.js
import { google } from "googleapis";

let _client = null;

function getCredentialsFromEnv() {
  const b64 = process.env.GA_CREDENTIALS_JSON_B64;
  if (!b64) throw new Error("GA_CREDENTIALS_JSON_B64 is missing");
  const json = Buffer.from(b64, "base64").toString("utf8");
  return JSON.parse(json);
}

export async function getAnalyticsClient() {
  if (_client) return _client;

  const credentials = getCredentialsFromEnv();

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
  });

  _client = google.analyticsdata({ version: "v1beta", auth });
  return _client;
}

export function getProperty() {
  const id = process.env.GA_PROPERTY_ID;
  if (!id) throw new Error("GA_PROPERTY_ID is missing");
  return `properties/${id}`;
}
