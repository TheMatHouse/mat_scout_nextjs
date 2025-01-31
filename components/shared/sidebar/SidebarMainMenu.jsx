"use client";
import Link from "next/link";
import { useState } from "react";
import SidebarSubMenu from "@/components/shared/sidebar/SidebarSubMenu";
import { ArrowDown } from "lucide-react";
import { usePathname } from "next/navigation";

const SidebarMainMenu = ({ menu, expanded }) => {
  const path = usePathname();

  const [subMenu, setSubMenu] = useState(false);

  return (
    <li className="my-2">
      {menu && menu.subMenu.length != 0 && (
        <>
          <a
            onClick={() => setSubMenu(!subMenu)}
            className={`flex items-center w-full px-3 py-2  text-white font-bold rounded-md cursor-pointer shadow ${
              path.split("/")[1] == menu.name.toLowerCase()
                ? "bg-ms-blue-gray"
                : "bg-ms-blue"
            }`}
          >
            <span className="pr-1">{menu.icon}</span>
            {expanded && menu.name}
            <ArrowDown
              className={`ml-auto w-3 fill-white transition-all ${
                subMenu ? "rotate-180" : "rotate-0"
              }`}
            />
          </a>
          <div className={subMenu ? "block" : "hidden"}>
            <SidebarSubMenu sMenu={menu.subMenu} />
          </div>
        </>
      )}
      {menu && menu.subMenu.length == 0 && (
        <Link
          href={menu.link}
          className={`flex items-center w-full px-3 py-2  text-white font-medium rounded-lg cursor-pointer shadow ${
            path.split("/")[1] == menu.name.toLowerCase()
              ? "bg-ms-blue-gray"
              : "bg-ms-blue"
          }`}
        >
          <span className="pr-1">{menu.icon}</span>
          {expanded && menu.name}
        </Link>
      )}
    </li>
  );
};

export default SidebarMainMenu;
