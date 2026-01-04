// app/(print)/teams/[slug]/flyer/page.jsx
"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import QRCode from "qrcode";
import { useUser } from "@/context/UserContext";
import { useTeam } from "@/context/TeamContext";
import Spinner from "@/components/shared/Spinner";

const TeamFlyerPage = () => {
  const { slug } = useParams();
  const { user } = useUser();
  const { team } = useTeam();

  const [qrDataUrl, setQrDataUrl] = useState(null);

  useEffect(() => {
    if (!team) return;

    const url = `${window.location.origin}/teams/${slug}/social-invite`;

    QRCode.toDataURL(url, {
      width: 600,
      margin: 2,
    }).then(setQrDataUrl);
  }, [team, slug]);

  if (!team || !qrDataUrl) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <Spinner size={64} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white print:bg-white">
      <div className="w-[850px] border-8 border-black p-12 text-center space-y-8">
        <img
          src="https://res.cloudinary.com/matscout/image/upload/v1752188084/matScout_email_logo_rx30tk.png"
          alt="MatScout"
          className="mx-auto h-20"
        />

        <h1 className="text-4xl font-extrabold text-black">Join Our Team</h1>

        <h2 className="text-3xl font-bold text-black">{team.teamName}</h2>

        <div className="flex justify-center">
          <img
            src={qrDataUrl}
            alt="Team QR Code"
            className="w-[320px] h-[320px]"
          />
        </div>

        <p className="text-xl font-semibold text-black">
          Scan to request access on MatScout
        </p>

        <p className="text-base text-gray-700">
          Approval required by a coach or manager
        </p>
      </div>
    </div>
  );
};

export default TeamFlyerPage;
