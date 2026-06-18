import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";

export type InvoicePdfProps = {
  business: {
    name: string;
    address: string;
    email: string;
    phone: string;
    taxId: string;
    iban: string;
    bic: string;
    bankName: string;
    logoDataUrl?: string | null;
    layoutPrimary: string;
    layoutAccent: string;
    footer: string;
    paymentTermsDays: number;
  };
  customer: {
    name: string;
    company: string | null;
    address: string | null;
    taxId: string | null;
  };
  invoice: {
    number: string;
    date: Date;
    dueDate: Date | null;
    items: { description: string; quantity: number; unitPrice: number; total: number }[];
    subtotal: number;
    vatRate: number;
    vatAmount: number;
    total: number;
    notes: string | null;
  };
};

const fmtMoney = (v: number) =>
  new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(v);

const fmtDate = (d: Date) =>
  new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);

export function InvoicePdf({ business, customer, invoice }: InvoicePdfProps) {
  const styles = StyleSheet.create({
    page: {
      backgroundColor: "#FFFFFF",
      color: "#0A0A0A",
      fontSize: 10,
      fontFamily: "Helvetica",
      padding: 48,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 36,
    },
    brandBlock: { maxWidth: 280 },
    logo: { width: 100, height: 40, objectFit: "contain", marginBottom: 8 },
    brandName: { fontSize: 16, fontWeight: 700, color: business.layoutPrimary },
    brandSubtle: { color: "#6B7280", marginTop: 4, lineHeight: 1.4 },
    invoiceMeta: {
      textAlign: "right",
      maxWidth: 200,
    },
    invoiceTitle: {
      fontSize: 22,
      fontWeight: 700,
      color: business.layoutPrimary,
      letterSpacing: 1.2,
      textTransform: "uppercase",
    },
    metaRow: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 6 },
    metaLabel: { color: "#6B7280" },
    metaValue: { fontWeight: 600 },
    addressRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 24,
      marginBottom: 32,
    },
    addressBlock: { maxWidth: 240 },
    addressLabel: {
      fontSize: 8,
      color: "#6B7280",
      textTransform: "uppercase",
      letterSpacing: 1,
      marginBottom: 4,
    },
    addressName: { fontSize: 11, fontWeight: 600 },
    addressLine: { color: "#374151", lineHeight: 1.5 },
    table: {
      borderTop: `1pt solid ${business.layoutAccent}`,
      borderBottom: `1pt solid ${business.layoutAccent}`,
      marginBottom: 16,
    },
    th: {
      flexDirection: "row",
      backgroundColor: business.layoutAccent,
      color: "#FFFFFF",
      padding: "8 12",
      fontSize: 9,
      letterSpacing: 0.8,
      textTransform: "uppercase",
    },
    tr: {
      flexDirection: "row",
      padding: "10 12",
      borderBottom: "0.5pt solid #E5E7EB",
    },
    colDesc: { flex: 1 },
    colQty: { width: 50, textAlign: "right" },
    colPrice: { width: 80, textAlign: "right" },
    colTotal: { width: 90, textAlign: "right" },
    sumWrap: {
      flexDirection: "row",
      justifyContent: "flex-end",
      marginTop: 12,
    },
    sum: { width: 220 },
    sumRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 4,
    },
    sumRowFinal: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 8,
      borderTop: `1pt solid ${business.layoutPrimary}`,
      marginTop: 4,
      fontWeight: 700,
      fontSize: 12,
    },
    notes: {
      marginTop: 28,
      padding: 12,
      backgroundColor: "#F9FAFB",
      borderLeft: `2pt solid ${business.layoutAccent}`,
      fontSize: 9.5,
      lineHeight: 1.5,
      color: "#374151",
    },
    paymentBlock: {
      marginTop: 28,
      padding: 12,
      borderTop: `0.5pt solid #E5E7EB`,
      fontSize: 9,
      color: "#374151",
      lineHeight: 1.5,
    },
    footer: {
      position: "absolute",
      bottom: 36,
      left: 48,
      right: 48,
      paddingTop: 10,
      borderTop: "0.5pt solid #E5E7EB",
      flexDirection: "row",
      justifyContent: "space-between",
      fontSize: 8,
      color: "#9CA3AF",
    },
  });

  const issuedAt = new Date(invoice.date);
  const due = invoice.dueDate ?? new Date(issuedAt.getTime());
  if (!invoice.dueDate) due.setDate(due.getDate() + business.paymentTermsDays);

  return (
    <Document
      title={`Rechnung ${invoice.number}`}
      author={business.name}
      creator={business.name}
      producer="Fylu Agency"
    >
      <Page size="A4" style={styles.page}>
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.brandBlock}>
            {business.logoDataUrl && (
              <Image src={business.logoDataUrl} style={styles.logo} />
            )}
            <Text style={styles.brandName}>{business.name}</Text>
            <View style={styles.brandSubtle}>
              {business.address.split("\n").map((line, i) => (
                <Text key={i}>{line}</Text>
              ))}
              {business.email && <Text>{business.email}</Text>}
              {business.phone && <Text>{business.phone}</Text>}
              {business.taxId && <Text>USt-ID: {business.taxId}</Text>}
            </View>
          </View>
          <View style={styles.invoiceMeta}>
            <Text style={styles.invoiceTitle}>Rechnung</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Nr.</Text>
              <Text style={styles.metaValue}>{invoice.number}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Datum</Text>
              <Text style={styles.metaValue}>{fmtDate(issuedAt)}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Fällig</Text>
              <Text style={styles.metaValue}>{fmtDate(due)}</Text>
            </View>
          </View>
        </View>

        {/* ADDRESS BLOCK */}
        <View style={styles.addressRow}>
          <View style={styles.addressBlock}>
            <Text style={styles.addressLabel}>Rechnung an</Text>
            <Text style={styles.addressName}>{customer.name}</Text>
            {customer.company && <Text style={styles.addressLine}>{customer.company}</Text>}
            {customer.address &&
              customer.address.split("\n").map((line, i) => (
                <Text key={i} style={styles.addressLine}>
                  {line}
                </Text>
              ))}
            {customer.taxId && (
              <Text style={[styles.addressLine, { marginTop: 4 }]}>
                USt-ID: {customer.taxId}
              </Text>
            )}
          </View>
        </View>

        {/* TABLE */}
        <View style={styles.table}>
          <View style={styles.th}>
            <Text style={styles.colDesc}>Leistung</Text>
            <Text style={styles.colQty}>Anzahl</Text>
            <Text style={styles.colPrice}>Preis</Text>
            <Text style={styles.colTotal}>Summe</Text>
          </View>
          {invoice.items.map((it, i) => (
            <View key={i} style={styles.tr}>
              <Text style={styles.colDesc}>{it.description}</Text>
              <Text style={styles.colQty}>{it.quantity}</Text>
              <Text style={styles.colPrice}>{fmtMoney(it.unitPrice)}</Text>
              <Text style={styles.colTotal}>{fmtMoney(it.total)}</Text>
            </View>
          ))}
        </View>

        {/* TOTALS */}
        <View style={styles.sumWrap}>
          <View style={styles.sum}>
            <View style={styles.sumRow}>
              <Text>Netto</Text>
              <Text>{fmtMoney(invoice.subtotal)}</Text>
            </View>
            <View style={styles.sumRow}>
              <Text>MwSt. {invoice.vatRate}%</Text>
              <Text>{fmtMoney(invoice.vatAmount)}</Text>
            </View>
            <View style={styles.sumRowFinal}>
              <Text>Gesamt</Text>
              <Text>{fmtMoney(invoice.total)}</Text>
            </View>
          </View>
        </View>

        {/* NOTES */}
        {invoice.notes && (
          <View style={styles.notes}>
            <Text>{invoice.notes}</Text>
          </View>
        )}

        {/* PAYMENT */}
        <View style={styles.paymentBlock}>
          <Text style={{ fontWeight: 600, marginBottom: 4 }}>
            Zahlungsinformationen
          </Text>
          <Text>
            Bitte überweise den Gesamtbetrag bis spätestens {fmtDate(due)} unter
            Angabe der Rechnungsnummer {invoice.number}.
          </Text>
          {business.iban && (
            <Text style={{ marginTop: 4 }}>
              {business.bankName ? `${business.bankName} · ` : ""}IBAN {business.iban}
              {business.bic ? ` · BIC ${business.bic}` : ""}
            </Text>
          )}
        </View>

        {/* FOOTER */}
        <View style={styles.footer} fixed>
          <Text>{business.footer}</Text>
          <Text>
            {business.name} · Seite{" "}
            <Text
              render={({ pageNumber, totalPages }) => `${pageNumber}/${totalPages}`}
            />
          </Text>
        </View>
      </Page>
    </Document>
  );
}
