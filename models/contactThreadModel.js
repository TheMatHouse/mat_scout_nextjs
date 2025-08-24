import mongoose from "mongoose";

const AttachmentSchema = new mongoose.Schema(
  {
    name: String,
    url: String,
    type: String,
    size: Number,
  },
  { _id: false }
);

const MessageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ["user", "admin", "system"], required: true },
    direction: { type: String, enum: ["inbound", "outbound"], required: true },
    body: String, // plain text
    html: String, // optional html
    fromName: String,
    fromEmail: String,
    sentAt: { type: Date, default: Date.now },
    messageId: String, // provider id / Message-ID (if available)
    inReplyTo: String, // Message-ID you're replying to (if available)
    attachments: [AttachmentSchema],
  },
  { _id: false }
);

const ContactThreadSchema = new mongoose.Schema(
  {
    subject: { type: String, required: true },
    fromName: { type: String, required: true },
    fromEmail: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ["open", "closed"],
      default: "open",
      index: true,
    },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    // unique token for plus-address reply routing, e.g. support+<token>@matscout.com
    replyToToken: { type: String, index: true },

    messages: { type: [MessageSchema], default: [] },
    lastMessageAt: { type: Date, default: Date.now, index: true },
    lastDirection: { type: String, enum: ["inbound", "outbound"] },
  },
  { timestamps: true }
);

ContactThreadSchema.index({ lastMessageAt: -1 });

export default mongoose.models.ContactThread ||
  mongoose.model("ContactThread", ContactThreadSchema);
