// app/(teams)/team/[slug]/members/page.jsx
"use client";

import ManagerMembersClient from "@/components/teams/ManagerMembersClient";

const MembersPage = ({ params }) => {
  const { slug } = params;

  return <ManagerMembersClient slug={slug} />;
};

export default MembersPage;
