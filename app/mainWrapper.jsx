"use client";
import React, { useEffect } from "react";
import StoreProvider, { useAppSelector } from "./redux";
import Sidebar from "@/components/sidebar";
import Navbar from "@/components/navbar";
import { useSession } from "next-auth/react";

const MainWrapperLayout = ({ children }) => {
  const isSidebarCollapsed = useAppSelector(
    (state) => state.global.isSidebarCollapsed
  );

  //const userInfo = useAppSelector((state) => state.global.userInfo);

  const { data: session } = useSession();
  const userInfo = session?.user;

  const isDarkMode = useAppSelector((state) => state.global.isDarkMode);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.add("light");
    }
  }, [isDarkMode]);

  return (
    <div
      className={`${
        isDarkMode ? "dark" : "light"
      } flex bg-gray-50 text-gray-900 w-full min-h-screen`}
    >
      <Sidebar className="z-30" />
      <main
        className={`flex flex-col w-full h-full  bg-gray-50 ${
          isSidebarCollapsed ? "md:pl-10" : "md:pl-64"
        } `}
      >
        <Navbar />
        {children}
      </main>
    </div>
  );
};

const MainWrapper = ({ children }) => {
  return (
    <StoreProvider>
      <MainWrapperLayout>{children}</MainWrapperLayout>
    </StoreProvider>
  );
};

export default MainWrapper;
