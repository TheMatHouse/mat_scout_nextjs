// app/[username]/training/page.jsx
export const dynamic = "force-dynamic";

import TrainingClient from "./TrainingClient";

async function TrainingPage({ params }) {
  const { username } = await params;

  return <TrainingClient username={username} />;
}

export default TrainingPage;
