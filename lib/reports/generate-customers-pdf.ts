import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export interface CustomerReportRow {
  name: string;
  phone: string | null;
  email: string | null;
  city: string | null;
  state: string | null;
}

export function generateCustomersReportPdf(businessName: string, rows: CustomerReportRow[]) {
  const doc = new jsPDF();

  doc.setFontSize(14);
  doc.text(businessName, 14, 16);
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(`Customer list - generated ${new Date().toLocaleDateString("en-IN", { dateStyle: "medium" })}`, 14, 22);

  autoTable(doc, {
    startY: 28,
    head: [["Name", "Phone", "Email", "City", "State"]],
    body: rows.map((r) => [r.name, r.phone ?? "—", r.email ?? "—", r.city ?? "—", r.state ?? "—"]),
    headStyles: { fillColor: [20, 33, 61] },
    styles: { fontSize: 9 },
  });

  doc.save(`customers-${new Date().toISOString().slice(0, 10)}.pdf`);
}
