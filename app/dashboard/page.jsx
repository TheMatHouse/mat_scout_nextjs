import { currentUser } from "@clerk/nextjs/server";

import DashboardTabs from "@/components/shared/dashboard/DashboardTabs";

const Dashboard = async () => {
  // const session = await auth();
  const user = await currentUser();
  console.log(user);

  const resUser = await fetch(
    `${process.env.NEXT_PUBLIC_API_DOMAIN}/dashboard/${user.publicMetadata.userMongoId}`
  );
  const userData = await resUser.json();

  const profile = userData.user;

  return (
    <div className="w-full">
      <div className="relative right-0">
        <DashboardTabs user={profile && profile[0]} />
      </div>
    </div>
  );
};

export default Dashboard;
