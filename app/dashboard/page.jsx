import React from "react";
import { auth } from "@/auth";
import { currentUser } from "@clerk/nextjs/server";

import { CiCamera } from "react-icons/ci";
import DashboardTabs from "@/components/shared/dashboard/DashboardTabs";
// import UserInfoCard from "@/components/UserInfoCard";

// const getUserById = async (id) => {
//   const res = await fetch(
//     `${process.env.NEXT_PUBLIC_API_DOMAIN}/dashboard/${id}`
//   );
//   const data = await res.json();

//   return data.user;
// };
const Dashboard = async () => {
  // const session = await auth();
  const user = await currentUser();
  console.log("USER ", user);
  // const res = await fetch(
  //   `${process.env.NEXT_PUBLIC_API_DOMAIN}/dashboard/${session?.user?.userId}`
  // );
  // const data = await res.json();
  // const user = data.user;

  return (
    <div className="w-full">
      <div className="relative right-0">
        {/* <DashboardTabs user={user && user[0]} /> */}
      </div>
    </div>
  );
};

export default Dashboard;
