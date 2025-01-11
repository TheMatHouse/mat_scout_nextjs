"use client";
import Link from "next/link";
import { useState } from "react";

const SidebarSubMenu = ({ sMenu }) => {
  const [subMenu, setSubMenu] = useState(false);
  return (
    <ul className="ml-6">
      {sMenu.map((m, i) => {
        return (
          <li key={i} className="my-3">
            {m.subMenu.length != 0 && (
              <>
                <a
                  onClick={() => setSubMenu(!subMenu)}
                  className="flex text-gray-900 bg-white font-medium px-3 py-2 rounded-lg cursor-pointer shadow"
                >
                  {m.name}
                </a>
                <div className={subMenu ? "block" : "hidden"}>
                  <SidebarSubMenu sMenu={m.subMenu} />
                </div>
              </>
            )}
            {m.subMenu.length == 0 && (
              <Link
                href={m.link}
                className="flex text-gray-900 bg-white font-medium px-3 py-2 rounded-lg cursor-pointer shadow"
              >
                {m.name}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
};

export default SidebarSubMenu;
