import ManagerMembersClient from "@/components/teams/ManagerMembersClient";

async function MembersPage({ params }) {
  const { slug } = await params;

  return <ManagerMembersClient slug={slug} />;
}

export default MembersPage;
