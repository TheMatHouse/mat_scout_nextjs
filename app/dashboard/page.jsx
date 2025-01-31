import { currentUser } from "@clerk/nextjs/server";
import DashboardTabs from "@/components/shared/dashboard/DashboardTabs";

const Dashboard = async () => {
  const user = await currentUser();

  const res = await fetch(
    //`${process.env.NEXT_PUBLIC_API_DOMAIN}/dashboard/${clerkData?.data._id}`
    `${process.env.NEXT_PUBLIC_API_DOMAIN}/dashboard/${user?.publicMetadata.userMongoId}`
  );
  const userData = await res?.json();
  const profile = userData?.user[0];

  const resStyles = await fetch(`${process.env.NEXT_PUBLIC_API_DOMAIN}/styles`);
  console.log(resStyles);
  const styles = await resStyles?.json();

  const resTechniques = await fetch(
    `${process.env.NEXT_PUBLIC_API_DOMAIN}/techniques`
  );
  const techniques = await resTechniques?.json();

  return (
    <div className="w-full">
      <div className="relative right-0">
        <DashboardTabs
          user={profile && profile}
          styles={styles}
          techniques={techniques}
        />
      </div>
    </div>
  );
};

export default Dashboard;
