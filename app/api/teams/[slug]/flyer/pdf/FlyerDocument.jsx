import {
  Document,
  Page,
  Text,
  Image,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 48,
    fontFamily: "Helvetica",
    textAlign: "center",
    backgroundColor: "#ffffff",
  },
  logo: {
    width: 220,
    marginBottom: 32,
    alignSelf: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 12,
  },
  teamName: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 24,
  },
  qr: {
    width: 300,
    height: 300,
    marginBottom: 24,
    alignSelf: "center",
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 6,
  },
  footer: {
    fontSize: 12,
    color: "#666",
  },
});

const FlyerDocument = ({ teamName, qrDataUrl }) => (
  <Document>
    <Page
      size="LETTER"
      style={styles.page}
    >
      <Image
        style={styles.logo}
        src="https://res.cloudinary.com/matscout/image/upload/v1752188084/matScout_logo_bg_blue_vsebxm.png"
      />

      <Text style={styles.title}>Join Our Team on MatScout</Text>

      <Text style={styles.teamName}>{teamName}</Text>

      <Image
        style={styles.qr}
        src={qrDataUrl}
      />

      <Text style={styles.subtitle}>Scan to request access</Text>

      <Text style={styles.footer}>Approval required by a coach or manager</Text>
    </Page>
  </Document>
);

export default FlyerDocument;
