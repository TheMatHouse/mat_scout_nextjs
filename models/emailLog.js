import mongoose from "mongoose";

const emailLogSchema = new mongoose.Schema({
  to: String,
  type: String,
  relatedUserId: String,
  teamId: String,
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400, // 24 hours = 60 * 60 * 24
  },
});

export default mongoose.models.EmailLog ||
  mongoose.model("EmailLog", emailLogSchema);
