export async function webEncryptScoutingBody(teamKey, sensitive) {
  if (!teamKey) throw new Error("Missing team key");

  const keyBytes =
    teamKey instanceof Uint8Array ? teamKey : new Uint8Array(teamKey);

  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const cryptoKey = await window.crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );

  const plaintext = new TextEncoder().encode(JSON.stringify(sensitive));

  const ciphertext = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    cryptoKey,
    plaintext
  );

  return {
    crypto: {
      version: 1,
      alg: "TBK-AES-GCM-256",
      ivB64: btoa(String.fromCharCode(...iv)),
      ciphertextB64: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
    },
    body: {
      athleteFirstName: "",
      athleteLastName: "",
      athleteNationalRank: "",
      athleteWorldRank: "",
      athleteClub: "",
      athleteCountry: "",
      athleteGrip: "",
      athleteAttacks: [],
      athleteAttackNotes: "",
    },
  };
}
