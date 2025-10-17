import { connectDB } from "@/lib/mongo";
import Faq from "@/models/Faq";
import FaqClient from "./FaqClient";

async function FaqPage() {
  await connectDB();
  const faqs = await Faq.find({ isPublished: true })
    .sort({ order: 1, updatedAt: -1 })
    .lean();

  return <FaqClient initialFaqs={JSON.parse(JSON.stringify(faqs))} />;
}

function PageWrapper() {
  return <FaqPage />;
}
export default PageWrapper;
