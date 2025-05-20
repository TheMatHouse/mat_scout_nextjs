"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { HomeIcon, UsersIcon, UserIcon, MenuIcon } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function AuthenticatedSidebar() {
  const pathname = usePathname();
  const { user, isSignedIn } = useUser();

  if (!isSignedIn || !user) return null;

  const username = user.username || user.id; // fallback if username is not set

  const navItems = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: <HomeIcon className="w-4 h-4 mr-2" />,
    },
    {
      label: "Teams",
      href: "/dashboard/teams",
      icon: <UsersIcon className="w-4 h-4 mr-2" />,
    },
    {
      label: "Profile",
      href: `/${username}`,
      icon: <UserIcon className="w-4 h-4 mr-2" />,
    },
  ];

  return (
    <>
      {/* Mobile Sidebar */}
      <div className="md:hidden p-2">
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
            >
              <MenuIcon className="w-6 h-6" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-[240px] p-4 bg-background"
          >
            <nav className="space-y-2 mt-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center px-3 py-2 rounded-md text-sm font-medium hover:bg-muted",
                    pathname === item.href && "bg-muted font-semibold"
                  )}
                >
                  {item.icon}
                  {item.label}
                </Link>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-[240px] bg-muted text-foreground p-4 space-y-6">
        <h2 className="text-xl font-bold tracking-tight">MatScout</h2>
        <nav className="space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center px-3 py-2 rounded-md text-sm font-medium hover:bg-muted transition",
                pathname === item.href && "bg-muted font-semibold"
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
    </>
  );
}
