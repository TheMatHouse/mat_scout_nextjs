"use client";
import SidebarMainMenu from "@/components/shared/sidebar/SidebarMainMenu";
/* ICONS */
import { LuChevronFirst, LuChevronLast, LuClipboardType } from "react-icons/lu";
import { MdOutlineDashboard } from "react-icons/md";
import { createContext, useState } from "react";

const menuList = [
  {
    name: "Teams",
    link: "/teams",
    icon: (
      <LuClipboardType
        className="pr-1"
        size={24}
      />
    ),
    subMenu: [],
  },
  {
    name: "Dashboard",
    link: "/dashboard",
    icon: (
      <MdOutlineDashboard
        className="pr-1"
        size={24}
      />
    ),
    subMenu: [],
  },
];

const SidebarContext = createContext();

const SidebarMenuBar = () => {
  const [expanded, setExpanded] = useState(true);
  return (
    <aside className="h-screen">
      <nav className="h-full flex flex-col border-r shwdow-sm bg-ms-blue">
        <div className="p-3 pb-2 flex justify-between items-center">
          <div
            className={`overflow-hidden transition-all ${
              expanded ? "w-28" : "w-18"
            }`}
          ></div>
          <button
            onClick={() => setExpanded((prev) => !prev)}
            className="p-1.5 rounded-lg"
          >
            {expanded ? (
              <LuChevronFirst
                size={24}
                color="white"
              />
            ) : (
              <LuChevronLast
                size={24}
                color="white"
              />
            )}
          </button>
        </div>
        <SidebarContext.Provider value={{ expanded }}>
          <ul className="flex-1 px-3">
            {menuList.map((menu, i) => {
              return (
                <SidebarMainMenu
                  key={i}
                  menu={menu}
                  expanded={expanded}
                />
              );
            })}
          </ul>
        </SidebarContext.Provider>
      </nav>
    </aside>
  );
};

export default SidebarMenuBar;
