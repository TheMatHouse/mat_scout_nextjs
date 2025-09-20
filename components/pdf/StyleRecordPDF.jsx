// components/pdf/StyleRecordPDF.jsx
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    paddingTop: 32,
    paddingBottom: 40,
    paddingHorizontal: 36,
    fontSize: 11,
  },

  // Header
  header: { marginBottom: 12 },
  logo: {
    width: 160,
    height: 42,
    objectFit: "contain",
    marginBottom: 6,
    alignSelf: "flex-start",
  },
  titleBlock: { alignItems: "center" },
  title: { fontSize: 18, fontWeight: 700, textAlign: "center" },
  subtitle: { fontSize: 11, color: "#666", textAlign: "center", marginTop: 2 },

  // Table
  table: {
    display: "table",
    width: "auto",
    borderStyle: "solid",
    borderWidth: 1,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    marginTop: 6,
  },
  row: { flexDirection: "row" },
  headerCell: {
    margin: 0,
    padding: 5,
    borderStyle: "solid",
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    backgroundColor: "#f2f2f2",
    fontWeight: 700,
  },
  cell: {
    margin: 0,
    padding: 5,
    borderStyle: "solid",
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
});

export default function StyleRecordPDF({
  logoUrl,
  userName,
  styleName,
  wins,
  losses,
  matches,
  includeStyleColumn = false, // optional; table adapts widths if true
}) {
  const title = `${styleName} Record`;
  const subtitle = `${userName} • Wins ${wins}, Losses ${losses}`;

  // Always-landscape column sets that include rank columns
  const headers = includeStyleColumn
    ? [
        { key: "style", label: "Style", width: "8%" },
        { key: "date", label: "Date", width: "8%" },
        { key: "eventName", label: "Event", width: "22%" },
        { key: "opponent", label: "Opponent", width: "14%" },
        { key: "opponentRank", label: "Opp. Rank", width: "11%" },
        { key: "myRank", label: "My Rank", width: "11%" },
        { key: "result", label: "Result", width: "6%" },
        { key: "division", label: "Division", width: "10%" },
        { key: "weight", label: "Weight", width: "10%" },
      ]
    : [
        { key: "date", label: "Date", width: "8%" },
        { key: "eventName", label: "Event", width: "24%" },
        { key: "opponent", label: "Opponent", width: "16%" },
        { key: "opponentRank", label: "Opp. Rank", width: "12%" },
        { key: "myRank", label: "My Rank", width: "12%" },
        { key: "result", label: "Result", width: "6%" },
        { key: "division", label: "Division", width: "11%" },
        { key: "weight", label: "Weight", width: "11%" },
      ];

  return (
    <Document>
      {/* ⬇⬇⬇ force landscape here */}
      <Page
        size="LETTER"
        orientation="landscape"
        style={styles.page}
      >
        {/* Header */}
        <View style={styles.header}>
          {logoUrl ? (
            <Image
              src={logoUrl}
              style={styles.logo}
            />
          ) : null}
          <View style={styles.titleBlock}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
        </View>

        {/* Table */}
        <View style={styles.table}>
          {/* Header row */}
          <View style={styles.row}>
            {headers.map((h) => (
              <Text
                key={h.key}
                style={[styles.headerCell, { width: h.width }]}
              >
                {h.label}
              </Text>
            ))}
          </View>

          {/* Data rows */}
          {Array.isArray(matches) && matches.length > 0 ? (
            matches.map((m, i) => (
              <View
                style={styles.row}
                key={i}
              >
                {headers.map((h) => (
                  <Text
                    key={h.key}
                    style={[styles.cell, { width: h.width }]}
                  >
                    {String(m[h.key] ?? "") || "—"}
                  </Text>
                ))}
              </View>
            ))
          ) : (
            <View style={styles.row}>
              <Text style={[styles.cell, { width: "100%" }]}>
                No matches found.
              </Text>
            </View>
          )}
        </View>
      </Page>
    </Document>
  );
}
