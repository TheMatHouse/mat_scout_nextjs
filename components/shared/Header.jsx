import Link from "next/link";
// ICONS
//import logo from "@/assets/mat_scout_logo.png";
import Image from "next/image";
//import { doLogout } from "@/app/actions";
//import { doLogout } from "@/app/actions";
//import ThemeSwitch from "@/components/ThemeSwitch";
//import { auth } from "@/auth";
import { headers } from "next/headers";
import headerImage from "@/assets/images/header_image_1920x312.png";
import Navbar from "./Navbar";

const Header = async () => {
  //const session = await auth();
  const headerList = await headers();
  const pathname = headerList.get("x-current-path");

  const pageType =
    pathname === "/" || pathname === "/about" || pathname === "features"
      ? "static"
      : "dynamic";
  return (
    <>
      <Navbar />

      <div className="hidden md:flex">
        {pageType === "static" && (
          <div className="headerImgContainer">
            <Image
              src={headerImage}
              alt="Header image of two guys wrestling"
              fluid="true"
              className="opacity-70"
            />
          </div>
        )}
      </div>
    </>
  );
};

export default Header;
