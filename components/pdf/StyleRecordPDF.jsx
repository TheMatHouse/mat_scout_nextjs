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
    paddingTop: 0,
    paddingBottom: 40,
    paddingHorizontal: 36,
    fontSize: 11,
  },
  header: {
    backgroundColor: "#1f2937",
    paddingVertical: 2, // compact header
    paddingHorizontal: 12,
    alignItems: "center",
  },
  logo: {
    width: 130, // larger logo
    height: 130,
    objectFit: "contain",
    marginBottom: 0,
    marginTop: 0,
  },
  title: {
    fontSize: 15,
    textAlign: "center",
    marginTop: 2,
    marginBottom: 0,
    color: "#ffffff",
  },
  subtitle: {
    fontSize: 10,
    textAlign: "center",
    color: "#d1d5db",
    marginTop: 1,
    marginBottom: 2,
  },
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
  includeStyleColumn = false, // <- NEW
}) {
  const title = `${userName} ${styleName} Record`;
  const summary = `Wins ${wins}, Losses ${losses}`;

  // When including "Style", rebalance widths to fit 6 or 7 cols nicely on Letter
  const headers = includeStyleColumn
    ? [
        { key: "style", label: "Style", width: "12%" },
        { key: "date", label: "Date", width: "12%" },
        { key: "eventName", label: "Event", width: "22%" },
        { key: "opponent", label: "Opponent", width: "20%" },
        { key: "result", label: "Result", width: "10%" },
        { key: "division", label: "Division", width: "12%" },
        { key: "weight", label: "Weight", width: "12%" },
      ]
    : [
        { key: "date", label: "Date", width: "14%" },
        { key: "eventName", label: "Event", width: "22%" },
        { key: "opponent", label: "Opponent", width: "22%" },
        { key: "result", label: "Result", width: "12%" },
        { key: "division", label: "Division", width: "14%" },
        { key: "weight", label: "Weight", width: "16%" },
      ];

  return (
    <Document>
      <Page
        size="LETTER"
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
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{summary}</Text>
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
                    {String(m[h.key] ?? "")}
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
