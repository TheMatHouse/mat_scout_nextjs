import { currentUser } from "@clerk/nextjs/server";

import DashboardTabs from "@/components/shared/dashboard/DashboardTabs";

const Dashboard = async () => {
  // const session = await auth();
  const user = await currentUser();

  const rs = await fetch(
    `${process.env.NEXT_PUBLIC_API_DOMAIN}/dashboard/clerk/${user.emailAddresses[0].emailAddress}`
  );

  const clerkData = await rs.json();
  console.log(clerkData.data._id);
  const resUser = await fetch(
    `${process.env.NEXT_PUBLIC_API_DOMAIN}/dashboard/${clerkData.data._id}`
  );
  const userData = await resUser.json();
  console.log(userData);
  const profile = userData.user;
  console.log("profile ", profile);
  return (
    <div className="w-full">
      <div className="relative right-0">
        <DashboardTabs user={profile && profile} />
      </div>
    </div>
  );
};

export default Dashboard;
