import { currentUser } from "@clerk/nextjs/server";

import DashboardTabs from "@/components/shared/dashboard/DashboardTabs";
import { CloseButton } from "react-toastify";

const Dashboard = async () => {
  // const session = await auth();
  const user = await currentUser();

  const rs = await fetch(
    `${process.env.NEXT_PUBLIC_API_DOMAIN}/dashboard/clerk/${user.emailAddresses[0].emailAddress}`
  );

  const clerkData = await rs.json();
  console.log("clerk Data ", clerkData);
  const resUser = await fetch(
    `${process.env.NEXT_PUBLIC_API_DOMAIN}/dashboard/${clerkData?.data._id}`
  );
  const userData = await resUser.json();
  console.log("user data ", userData);
  const profile = userData.user[0];

  return (
    <div className="w-full">
      <div className="relative right-0">
        <DashboardTabs user={profile && profile} />
      </div>
    </div>
  );
};

export default Dashboard;
