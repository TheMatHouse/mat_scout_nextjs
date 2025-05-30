import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-default-dev-secret";

// This verifies a JWT and returns the payload (e.g. user data)
export function verifyToken(token) {
  return new Promise((resolve, reject) => {
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) return reject(err);
      resolve(decoded);
    });
  });
}
