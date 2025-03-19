import { AlertDialog } from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import moment from "moment";
import React from "react";

const PreviewMatchReportModal = ({ previewOpen, setPreviewOpen, report }) => {
  return (
    <Dialog
      open={previewOpen}
      onOpenChange={setPreviewOpen}
    >
      <DialogContent className="overflow-y-scroll max-h-screen min-w-fit max-w-3xl">
        <DialogHeader>
          <DialogTitle>Full Match Report</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
          <div className="py-3">
            <div className="flex flex-col">
              <h3 className="text-xl font-bold text-center">Match Info</h3>
              <div className="py-1">
                <h4 className="text-xl font-bold">Oppenent Name: </h4>{" "}
                {report.opponentName}
              </div>

              <div className="py-1">
                <h4 className="text-xl font-bold">Match Type: </h4>{" "}
                {report.matchType}
              </div>

              <div className="py-1">
                <h4 className="text-xl font-bold">Event Name :</h4>{" "}
                {report.eventName}
              </div>
              <div className="py-1">
                <h4 className="text-xl font-bold">Event Date: </h4>
                {moment(report.eventStartDate).format("MMMM-DD-yyyy")}
                {report.eventEndDate
                  ? `-${moment(report.eventEndDate).format("MMMM-DD-yyyy")}`
                  : ""}
              </div>
              <div className="py-1">
                <h4 className="text-xl font-bold">Weight Category: </h4>{" "}
                {report.weightCategory}
              </div>

              <div className="py-1">
                <h4 className="text-xl font-bold">Club: </h4>{" "}
                {report.opponentClub}
              </div>

              <div className="py-1">
                <h4 className="text-xl font-bold">Rank: </h4>{" "}
                {report.opponentRank}
              </div>

              <div className="py-1">
                <h4 className="text-xl font-bold">Grip: </h4>{" "}
                {report.opponentGrip}
              </div>

              <div className="py-1">
                <h4 className="text-xl font-bold">Opponent Country: </h4>&nbsp;{" "}
                {report.opponentCountry}
              </div>

              <div className="py-1">
                <h4 className="text-xl font-bold">Attacks: </h4>
                {report &&
                  report.opponentAttacks.map((attack, i) => (
                    <span key={i}>
                      {attack}
                      <br />
                    </span>
                  ))}
              </div>

              <div className="py-1">
                <h4 className="text-xl font-bold">
                  Notes on opponent attacks:{" "}
                </h4>{" "}
                <div
                  dangerouslySetInnerHTML={{
                    __html: `${report.opponentAttackNotes}`,
                  }}
                />
              </div>

              <div className="py-1">
                <h4 className="text-xl font-bold">My attacks: </h4>
                {report &&
                  report.athleteAttacks.map((attack, i) => (
                    <span key={i}>
                      {attack}
                      <br />
                    </span>
                  ))}
              </div>

              <div className="py-1">
                <h4 className="text-xl font-bold">Notes on my attacks: </h4>{" "}
                <div
                  dangerouslySetInnerHTML={{
                    __html: `${report.athleteAttackNotes}`,
                  }}
                />
              </div>

              <div className="py-1">
                <h4 className="text-xl font-bold">Outcome: </h4> {report.result}
              </div>

              <div className="py-1">
                <h4 className="text-xl font-bold">Score: </h4> {report.score}
              </div>

              <div className="py-1">
                <h4 className="text-xl font-bold">
                  This report is set to{" "}
                  <h4 className="text-xl font-bold">
                    {report.isPublic === true ? "Public" : "Private"}
                  </h4>
                </h4>
              </div>
            </div>
          </div>
          <div className="py-3">
            <h3 className="text-xl font-bold text-center">Video</h3>
            {report?.videoTitle ? (
              <>
                <h3 className="py-3">{report.videoTitle}</h3>
                <iframe
                  width="100%"
                  height="315"
                  src={report.videoURL}
                  alt={report.videoTitle}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; web-share"
                  allowFullScreen
                ></iframe>
              </>
            ) : (
              <h3>No video</h3>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PreviewMatchReportModal;
