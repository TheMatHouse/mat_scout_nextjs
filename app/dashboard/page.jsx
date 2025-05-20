// app/dashboard/page.jsx
import { currentUser } from "@clerk/nextjs/server";
import ClientDashboard from "@/components/dashboard/ClientDashboard";

const Dashboard = async () => {
  const user = await currentUser();

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_DOMAIN}/dashboard/${user?.publicMetadata.userMongoId}`
  );
  const userData = await res?.json();
  const profile = userData?.user[0];

  const resStyles = await fetch(`${process.env.NEXT_PUBLIC_API_DOMAIN}/styles`);
  const stylesData = await resStyles?.json();
  const styles = stylesData?.styles || [];

  const resTechniques = await fetch(
    `${process.env.NEXT_PUBLIC_API_DOMAIN}/techniques`
  );
  const techniquesData = await resTechniques?.json();
  const techniques = techniquesData?.techniques || [];

  return (
    <ClientDashboard
      user={profile}
      styles={styles}
      techniques={techniques}
    />
  );
};

export default Dashboard;
