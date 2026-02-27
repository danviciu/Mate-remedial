import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

export async function generateReportPdfFromElement(element, fileName = "mate-reset-raport.pdf") {
  if (!element) return false;
  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
  });

  const imageData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 8;
  const usableWidth = pageWidth - margin * 2;
  const scaledHeight = (canvas.height * usableWidth) / canvas.width;
  const renderHeight = Math.min(scaledHeight, pageHeight - margin * 2);

  pdf.addImage(imageData, "PNG", margin, margin, usableWidth, renderHeight, "", "FAST");
  pdf.save(fileName);
  return true;
}
