import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatMoneyPlain } from "@/lib/money";

export interface SalesReportRow {
  invoiceNumber: string;
  invoiceDate: string | Date;
  customerName: string;
  grandTotalMinor: number;
  paymentStatus: string;
}

export function generateSalesReportPdf(businessName: string, rows: SalesReportRow[]) {
  const doc = new jsPDF();

  doc.setFontSize(14);
  doc.text(businessName, 14, 16);
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(`Sales report - generated ${new Date().toLocaleDateString("en-IN", { dateStyle: "medium" })}`, 14, 22);

  const totalMinor = rows.reduce((sum, r) => sum + r.grandTotalMinor, 0);

  autoTable(doc, {
    startY: 28,
    head: [["Invoice #", "Date", "Customer", "Total", "Status"]],
    body: rows.map((r) => [
      r.invoiceNumber,
      new Date(r.invoiceDate).toLocaleDateString("en-IN", { dateStyle: "medium" }),
      r.customerName,
      formatMoneyPlain(r.grandTotalMinor),
      r.paymentStatus.replace("_", " "),
    ]),
    foot: [["", "", "Total", formatMoneyPlain(totalMinor), ""]],
    headStyles: { fillColor: [20, 33, 61] },
    footStyles: { fillColor: [251, 247, 240], textColor: [20, 33, 61], fontStyle: "bold" },
    styles: { fontSize: 9 },
  });

  doc.save(`sales-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}
