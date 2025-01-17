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
  console.log(user);
  // console.log(user.id);
  const clerk = user.emailAddresses[0].emailAddress;

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_DOMAIN}/dashboard/clerk/${clerk}`
  );

  const data = await res.json();
  //console.log("id ", data.data._id);
  const userId = data?.data._id;

  const resUser = await fetch(
    `${process.env.NEXT_PUBLIC_API_DOMAIN}/dashboard/${userId}`
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
