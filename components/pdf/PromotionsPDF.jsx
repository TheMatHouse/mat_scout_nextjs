// components/pdf/PromotionsPDF.jsx
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 11, fontFamily: "Helvetica" },

  // Header: logo left, then centered title + name underneath
  header: { marginBottom: 16 },
  logo: {
    width: 160,
    height: 42,
    objectFit: "contain",
    marginBottom: 8,
    alignSelf: "flex-start",
  },
  titleBlock: { alignItems: "center" },
  title: { fontSize: 18, fontWeight: 700, textAlign: "center" },
  sub: { marginTop: 2, color: "#666", textAlign: "center" },

  info: { marginTop: 12, marginBottom: 12, lineHeight: 1.4 },

  table: {
    display: "table",
    width: "auto",
    borderStyle: "solid",
    borderWidth: 1,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    marginTop: 8,
  },
  row: { flexDirection: "row" },
  th: {
    margin: 0,
    padding: 6,
    fontSize: 11,
    fontWeight: 700,
    borderStyle: "solid",
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    backgroundColor: "#f3f4f6",
  },
  td: {
    margin: 0,
    padding: 6,
    fontSize: 11,
    borderStyle: "solid",
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  colDate: { width: 120 },
  colRank: { width: 160 },
  colBy: { width: 150 },
  colNote: { width: 180, flexGrow: 1 },
});

export default function PromotionsPDF({
  logoUrl = "",
  userName = "",
  styleName = "",
  startDate = null,
  currentRank = "",
  promotions = [],
}) {
  const startText = startDate
    ? new Date(startDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
      })
    : null;

  return (
    <Document>
      <Page
        size="LETTER"
        style={styles.page}
      >
        <View style={styles.header}>
          {logoUrl ? (
            <Image
              src={logoUrl}
              style={styles.logo}
            />
          ) : null}
          <View style={styles.titleBlock}>
            <Text style={styles.title}>Promotion History — {styleName}</Text>
            <Text style={styles.sub}>{userName}</Text>
          </View>
        </View>

        <View style={styles.info}>
          {startText ? (
            <Text>
              Started {styleName}: {startText}
            </Text>
          ) : null}
          {currentRank ? <Text>Current Rank: {currentRank}</Text> : null}
          <Text>Total Promotions: {promotions.length}</Text>
        </View>

        <View style={styles.table}>
          <View style={styles.row}>
            <Text style={[styles.th, styles.colDate]}>Date</Text>
            <Text style={[styles.th, styles.colRank]}>Rank</Text>
            <Text style={[styles.th, styles.colBy]}>Awarded By</Text>
            <Text style={[styles.th, styles.colNote]}>Note</Text>
          </View>

          {promotions.map((p, i) => (
            <View
              key={i}
              style={styles.row}
            >
              <Text style={[styles.td, styles.colDate]}>
                {p?.promotedOn
                  ? new Date(p.promotedOn).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : ""}
              </Text>
              <Text style={[styles.td, styles.colRank]}>{p?.rank || ""}</Text>
              <Text style={[styles.td, styles.colBy]}>
                {p?.awardedBy || ""}
              </Text>
              <Text style={[styles.td, styles.colNote]}>{p?.note || ""}</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}
