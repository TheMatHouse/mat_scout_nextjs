// lib/ga.js
import "server-only";
import { BetaAnalyticsDataClient } from "@google-analytics/data";

let _client = null;

function getCredentialsFromEnv() {
  const b64 = process.env.GA_CREDENTIALS_JSON_B64;
  if (!b64) throw new Error("GA_CREDENTIALS_JSON_B64 is missing");
  const json = Buffer.from(b64, "base64").toString("utf8");
  return JSON.parse(json);
}

export function getProperty() {
  const id = process.env.GA_PROPERTY_ID;
  if (!id) throw new Error("GA_PROPERTY_ID is missing");
  return `properties/${id}`;
}

export function getAnalyticsClient() {
  if (_client) return _client;
  const creds = getCredentialsFromEnv();

  _client = new BetaAnalyticsDataClient({
    // These three fields are enough for service-account auth
    projectId: creds.project_id,
    credentials: {
      client_email: creds.client_email,
      private_key: creds.private_key,
    },
  });

  return _client;
}
