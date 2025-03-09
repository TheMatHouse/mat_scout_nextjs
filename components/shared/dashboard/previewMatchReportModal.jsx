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
  console.log(report);
  return (
    <Dialog
      open={previewOpen}
      onOpenChange={setPreviewOpen}
    >
      <DialogContent className="overflow-y-scroll max-h-screen min-w-fit max-w-3xl">
        <DialogHeader>
          <DialogTitle>Full Match Report</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 pb-4">
          <div>
            <div className="flex flex-col">
              <div className="py-1">
                <strong>Oppenent Name: </strong> {report.opponentName}
              </div>

              <div className="py-1">
                <strong>Match Type: </strong> {report.matchType}
              </div>

              <div className="py-1">
                <strong>Event Name :</strong> {report.eventName}
              </div>
              <div className="py-1">
                <strong>Event Date: </strong>
                {moment(report.eventStartDate).format("MMMM-DD-yyyy")}
                {report.eventEndDate
                  ? `-${moment(report.eventEndDate).format("MMMM-DD-yyyy")}`
                  : ""}
              </div>
              <div className="py-1">
                <strong>Weight Category: </strong> {report.weightCategory}
              </div>

              <div className="py-1">
                <strong>Club: </strong> {report.opponentClub}
              </div>

              <div className="py-1">
                <strong>Rank: </strong> {report.opponentRank}
              </div>

              <div className="py-1">
                <strong>Grip: </strong> {report.opponentGrip}
              </div>

              <div className="py-1">
                <strong>Opponent Country: </strong>&nbsp;{" "}
                {report.opponentCountry}
              </div>

              <div className="py-1">
                <strong>Attacks: </strong>
                {report &&
                  report.opponentAttacks.map((attack, i) => (
                    <span key={i}>
                      {attack}
                      <br />
                    </span>
                  ))}
              </div>

              <div className="py-1">
                <strong>Notes on opponent attacks: </strong>{" "}
                <div
                  dangerouslySetInnerHTML={{
                    __html: `${report.opponentAttackNotes}`,
                  }}
                />
              </div>

              <div className="py-1">
                <strong>My attacks: </strong>
                {report &&
                  report.athleteAttacks.map((attack, i) => (
                    <span key={i}>
                      {attack}
                      <br />
                    </span>
                  ))}
              </div>

              <div className="py-1">
                <strong>Notes on my attacks: </strong>{" "}
                <div
                  dangerouslySetInnerHTML={{
                    __html: `${report.athleteAttackNotes}`,
                  }}
                />
              </div>

              <div className="py-1">
                <strong>Outcome: </strong> {report.result}
              </div>

              <div className="py-1">
                <strong>Score: </strong> {report.score}
              </div>
            </div>
          </div>
          <div>
            <strong>Video</strong>
            {report?.videoTitle ? (
              <>
                <h3>{report.videoTitle}</h3>
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
