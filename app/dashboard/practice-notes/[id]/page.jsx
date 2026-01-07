// app/dashboard/practice-notes/[id]/page.jsx
import { connectDB } from "@/lib/mongo";
import { getCurrentUser } from "@/lib/auth-server";
import PracticeNote from "@/models/practiceNoteModel";
import PracticeNoteDetailClient from "./PracticeNoteDetailClient";

export const dynamic = "force-dynamic";

async function PracticeNoteDetailPage({ params }) {
  await connectDB();

  const user = await getCurrentUser();
  if (!user?._id) {
    return <div className="p-6">Unauthorized</div>;
  }

  const { id } = await params;

  const note = await PracticeNote.findOne({
    _id: id,
    user: user._id,
  }).lean();

  if (!note) {
    return <div className="p-6">Practice note not found</div>;
  }

  // Ensure plain serializable object
  const safeNote = JSON.parse(JSON.stringify(note));

  return <PracticeNoteDetailClient note={safeNote} />;
}

export default PracticeNoteDetailPage;
