import jwt from "jsonwebtoken";

const generateToken = (res, userId) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });

  // Set JWT as HTTP-Only cookie
  res.cookie("jwt", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV !== "development",
    sameSite: "strict",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });
  return token;
};

export const generateEmailToken = (res, userId) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET);

  return token;
};
// Will likely use this version for the app
// export const generateEmailToken = () => {
//   let token = "";
//   const length = 6;

//   for (let i = 0; i < length; i++) {
//     const digit = Math.floor(Math.random() * 10);
//     token += digit;
//   }

//   console.log(token);
//   return token;
// };

export default generateToken;
