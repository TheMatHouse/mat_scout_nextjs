import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import React from "react";

const PreviewReportModal = ({
  previewOpen,
  setPreviewOpen,
  report,
  reportType,
}) => {
  console.log(report);
  return (
    <Dialog
      open={previewOpen}
      onOpenChange={setPreviewOpen}
    >
      <DialogContent className="overflow-y-scroll max-h-screen min-w-fit sm:w-90 max-w-6xl">
        <DialogHeader>
          <DialogTitle>
            Full {reportType === "match" ? "Match" : "Scouting"} Report
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
          <div className="py-3">
            <div className="flex flex-col">
              <h3 className="text-xl font-bold text-center">Athlete Info</h3>
              <div className="py-1">
                <h4 className="text-xl font-bold">Athlete Name: </h4>
                {`${report.athleteFirstName} ${report.athleteLastName}`}
              </div>

              <div className="py-1">
                <h4 className="text-xl font-bold">Country: </h4>
                {report.athleteCountry}
              </div>

              <div className="py-1">
                <h4 className="text-xl font-bold">National Rank: </h4>
                {report.athleteNationalRank}
              </div>

              <div className="py-1">
                <h4 className="text-xl font-bold">World Ranking: </h4>
                {report.athleteWorldRank}
              </div>

              <div className="py-1">
                <h4 className="text-xl font-bold">Match Type: </h4>
                {report.matchType}
              </div>

              <div className="py-1">
                <h4 className="text-xl font-bold">Division: </h4>
                {report.division}
              </div>

              <div className="py-1">
                <h4 className="text-xl font-bold">Weight Class: </h4>
                {report.weightCategory}
              </div>

              <div className="py-1">
                <h4 className="text-xl font-bold">Rank: </h4>
                {report.athleteRank}
              </div>

              <div className="py-1">
                <h4 className="text-xl font-bold">Grip/Stance: </h4>
                {report.athleteGrip}
              </div>

              <div className="py-1">
                <h4 className="text-xl font-bold">Attacks used: </h4>
                {report &&
                  report.athleteAttacks.map((attack, i) => (
                    <span key={i}>
                      {attack}
                      <br />
                    </span>
                  ))}
              </div>
              <div className="py-1 w-full text-wrap">
                <h4 className="text-xl font-bold">Notes: </h4>
                <div
                  className="w-90 text-wrap"
                  dangerouslySetInnerHTML={{
                    __html: `${report.athleteAttackNotes}`,
                  }}
                />
              </div>
            </div>
          </div>
          <div className="py-3">
            <div className="flex flex-col">
              <h3 className="text-xl font-bold text-center">Videos</h3>

              {report.videos && report.videos.length > 0 ? (
                report.videos.map((video) => (
                  <div
                    key={video._id}
                    className="border-b-2 border-ms-blue-gray py-5"
                  >
                    <div>
                      <div className="py-2">
                        <strong>{video.videoTitle}</strong>
                        <div
                          className="w-full py-2 sm:text-wrap"
                          dangerouslySetInnerHTML={{
                            __html: `${video.videoNotes}`,
                          }}
                        />
                        <div
                          className="py-2 w-full"
                          dangerouslySetInnerHTML={{
                            __html: `${video.videoURL}`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <h5 className="my-3">No videos for this report</h5>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PreviewReportModal;
