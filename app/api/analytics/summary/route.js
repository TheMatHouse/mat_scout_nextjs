// app/api/analytics/summary/route.js
export async function GET(req) {
  try {
    const url = new URL(req.url);
    const range = url.searchParams.get("range") || "7d";
    const debug = url.searchParams.get("debug") === "1";

    const propertyId = process.env.GA_PROPERTY_ID;
    if (!propertyId) {
      return NextResponse.json(
        { error: "GA_PROPERTY_ID env var is missing." },
        { status: 500 }
      );
    }

    const client = getGAClient();

    let e1 = null,
      e2 = null,
      e3 = null;
    const [summary, topPages, topEvents] = await Promise.all([
      fetchSummary(client, propertyId, range).catch(
        (err) => ((e1 = err), null)
      ),
      fetchTopPages(client, propertyId, range).catch((err) => ((e2 = err), [])),
      fetchTopEvents(client, propertyId, range).catch(
        (err) => ((e3 = err), [])
      ),
    ]);

    return NextResponse.json({
      summary,
      topPages,
      topEvents,
      ...(debug && {
        _debug: {
          summaryError: e1?.message,
          pagesError: e2?.message,
          eventsError: e3?.message,
          hasClientEmail: !!process.env.GA_CLIENT_EMAIL,
          hasPrivateKey: !!process.env.GA_PRIVATE_KEY,
          propertyId,
        },
      }),
    });
  } catch (err) {
    const message =
      err?.errors?.[0]?.message || err?.message || "Analytics error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
