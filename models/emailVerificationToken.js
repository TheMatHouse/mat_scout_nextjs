import { Schema, model, models } from "mongoose";
import bcrypt from "bcryptjs";

const EmailVerificationTokenSchema = new Schema({
  owner: {
    type: Schema.Types.ObjectId,
    required: true,
  },
  token: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    expires: "20m",
    default: Date.now,
  },
});

EmailVerificationTokenSchema.methods.compareToken = async function (token) {
  const result = await bcrypt.compare(token, this.token);

  return result;
};

EmailVerificationTokenSchema.pre("save", async function (next) {
  if (this.isModified("token")) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.token = await bcrypt.hash(this.token, salt);
});

// const EmailVerificationToken = mongoose.model(
//   "EmailVerificationToken",
//   emailVerificationTokenSchema
// );

export const EmailVerificationToken =
  models.EmailVerificationToken ||
  model("EmailVerificationToken", EmailVerificationTokenSchema);
//export default EmailVerificationToken;
