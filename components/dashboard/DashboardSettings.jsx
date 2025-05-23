"use client";
import { useState } from "react";
import { Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import SettingsForm from "./forms/SettingsForm";

export default function DashboardSettings({ user, error }) {
  const [open, setOpen] = useState(false);

  if (!user) {
    return (
      <section className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">Personal Settings</h1>
        <p className="text-red-500">
          {error || "Unable to load your profile data. Please try again."}
        </p>
      </section>
    );
  }

  return (
    <section className="max-w-3xl mx-auto px-4 py-8">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Personal Settings</h1>
        <Dialog
          open={open}
          onOpenChange={setOpen}
        >
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
            >
              Edit Settings <Pencil className="ml-2 h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Settings</DialogTitle>
              <DialogDescription>
                Update your personal settings below.
              </DialogDescription>
            </DialogHeader>
            <SettingsForm
              user={user}
              onClose={() => setOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </header>

      <div className="space-y-4">
        <div className="rounded-lg border bg-card text-card-foreground p-4">
          <h2 className="text-lg font-semibold mb-1">Location</h2>
          {user.city && user.state && user.country ? (
            <p className="text-sm">
              {user.city}, {user.state}, {user.country}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              No location info provided
            </p>
          )}
        </div>
        <div className="rounded-lg border bg-card text-card-foreground p-4">
          <h2 className="text-lg font-semibold mb-1">Privacy Settings</h2>
          <p className="text-sm">
            Your profile is currently{" "}
            <span className="font-semibold">
              {user.allowPublic === "Public" ? "Public" : "Private"}
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}
