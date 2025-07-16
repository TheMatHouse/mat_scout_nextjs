export async function POST(request, context) {
  await connectDB();
  const { userId, memberId, scoutingReportId } = await context.params;
  const currentUser = await getCurrentUserFromCookies();

  if (
    !Types.ObjectId.isValid(userId) ||
    !Types.ObjectId.isValid(memberId) ||
    !Types.ObjectId.isValid(scoutingReportId)
  ) {
    return NextResponse.json(
      { message: "Invalid ID(s) provided" },
      { status: 400 }
    );
  }

  if (!currentUser || String(currentUser._id) !== String(userId)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await request.json();
    const video = await Video.create({
      videoTitle: data.videoTitle,
      videoURL: data.videoURL,
      videoNotes: data.videoNotes,
      report: scoutingReportId,
      addedBy: currentUser._id,
    });

    return NextResponse.json(
      { message: "Family member video added", video },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error adding family video:", error);
    return NextResponse.json(
      { message: "Failed to add video" },
      { status: 500 }
    );
  }
}

export async function GET(request, context) {
  await connectDB();
  const { userId, memberId, scoutingReportId } = await context.params;
  const currentUser = await getCurrentUserFromCookies();

  if (
    !Types.ObjectId.isValid(userId) ||
    !Types.ObjectId.isValid(memberId) ||
    !Types.ObjectId.isValid(scoutingReportId)
  ) {
    return NextResponse.json(
      { message: "Invalid ID(s) provided" },
      { status: 400 }
    );
  }

  if (!currentUser || String(currentUser._id) !== String(userId)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const videos = await Video.find({ report: scoutingReportId }).sort({
      createdAt: -1,
    });
    return NextResponse.json({ videos }, { status: 200 });
  } catch (error) {
    console.error("Error fetching family videos:", error);
    return NextResponse.json(
      { message: "Failed to fetch videos" },
      { status: 500 }
    );
  }
}
