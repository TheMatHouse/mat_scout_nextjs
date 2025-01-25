import { currentUser } from "@clerk/nextjs/server";
import DashboardTabs from "@/components/shared/dashboard/DashboardTabs";

const Dashboard = async () => {
  const user = await currentUser();

  // const rs = await fetch(
  //   `${process.env.NEXT_PUBLIC_API_DOMAIN}/dashboard/clerk/${user.emailAddresses[0].emailAddress}`
  // );

  // const clerkData = await rs.json();

  const res = await fetch(
    //`${process.env.NEXT_PUBLIC_API_DOMAIN}/dashboard/${clerkData?.data._id}`
    `${process.env.NEXT_PUBLIC_API_DOMAIN}/dashboard/${user?.publicMetadata.userMongoId}`
  );
  const userData = await res.json();

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
