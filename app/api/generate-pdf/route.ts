import { type NextRequest, NextResponse } from "next/server";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// Structured content types for PDF rendering
interface ContentBlock {
  type: "header" | "paragraph" | "list" | "table" | "cta";
  content: string;
  level?: number;
  items?: string[];
  tableData?: {
    headers: string[];
    rows: string[][];
  };
}

function parseMarkdownToBlocks(markdown: string): ContentBlock[] {
  const lines = markdown.split("\n");
  const blocks: ContentBlock[] = [];
  let currentTable: { headers: string[]; rows: string[][] } | null = null;
  let currentList: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Handle table rows
    if (line.includes("|") && line.split("|").length > 2) {
      const cells = line
        .split("|")
        .map((cell) => cell.trim())
        .filter((cell) => cell)
        .map(
          (cell) =>
            cell
              .replace(/\*\*(.*?)\*\*/g, "$1") // Remove bold markdown
              .replace(/\*(.*?)\*/g, "$1") // Remove italic markdown
              .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1") // Remove link markdown, keep text
        );

      // Skip separator rows
      if (cells.every((cell) => /^-+$/.test(cell))) {
        continue;
      }

      if (!currentTable) {
        currentTable = { headers: cells, rows: [] };
      } else {
        currentTable.rows.push(cells);
      }
      continue;
    }

    // End table
    if (currentTable) {
      blocks.push({
        type: "table",
        content: "",
        tableData: currentTable,
      });
      currentTable = null;
    }

    // End list
    if (currentList.length > 0 && !line.match(/^\s*[-*+]\s/)) {
      blocks.push({
        type: "list",
        content: "",
        items: currentList,
      });
      currentList = [];
    }

    // Handle headers
    if (line.startsWith("#")) {
      const level = line.match(/^#+/)?.[0].length || 1;
      const text = line.replace(/^#+\s*/, "");
      blocks.push({
        type: "header",
        content: text,
        level,
      });
      continue;
    }

    // Handle list items
    if (line.match(/^\s*[-*+]\s/)) {
      const item = line.replace(/^\s*[-*+]\s/, "");
      currentList.push(item);
      continue;
    }

    // Handle CTA - only detect the specific link line, not headers
    if (line.includes("Try Comet Pro for Free: https://pplx.ai/jack31428")) {
      blocks.push({
        type: "cta",
        content:
          "Recommended Browser: Comet by Perplexity - Try Comet Pro for Free at https://pplx.ai/jack31428",
      });
      continue;
    }

    // Handle regular paragraphs
    if (line) {
      blocks.push({
        type: "paragraph",
        content: line,
      });
    }
  }

  // Handle remaining table/list
  if (currentTable) {
    blocks.push({
      type: "table",
      content: "",
      tableData: currentTable,
    });
  }
  if (currentList.length > 0) {
    blocks.push({
      type: "list",
      content: "",
      items: currentList,
    });
  }

  return blocks;
}

function generateBusinessPlanPDF(businessPlan: string, email: string): string {
  try {
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    // Parse markdown into structured blocks
    const blocks = parseMarkdownToBlocks(businessPlan);

    // Add branded header
    addBrandedHeader(pdf, email);

    // Render content blocks
    let yPosition = 60; // Start below header
    const pageHeight = 280; // A4 height minus margins
    const leftMargin = 20;
    const contentWidth = 170;
    const blockSpacing = 8; // Consistent spacing between blocks

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];

      // Add spacing before each block (except the first one)
      if (i > 0) {
        yPosition += blockSpacing;
      }

      yPosition = renderContentBlock(
        pdf,
        block,
        yPosition,
        leftMargin,
        contentWidth,
        pageHeight
      );
    }

    // Add branded footer to all pages
    addBrandedFooter(pdf);

    // Return as base64 string
    return pdf.output("datauristring").split(",")[1];
  } catch (error) {
    console.error("Error generating PDF:", error);
    return "";
  }
}

function addBrandedHeader(pdf: jsPDF, email: string) {
  // Try to add logo (if available)
  try {
    // Note: In a real implementation, you'd need to load the logo file
    // For now, we'll use a text logo with enhanced styling
    pdf.setFontSize(24);
    pdf.setTextColor(118, 185, 0); // Primary green #76B900
    pdf.setFont("helvetica", "bold");
    pdf.text("5Q Strategy", 20, 18);

    // Add a subtle underline
    pdf.setDrawColor(118, 185, 0);
    pdf.line(20, 19, 80, 19);
  } catch (error) {
    console.log("Logo not available, using enhanced text logo");
  }

  // Add header bar with gradient effect
  pdf.setFillColor(118, 185, 0); // Primary green #76B900
  pdf.rect(0, 25, 210, 10, "F");

  // Add title on green background
  pdf.setFontSize(18);
  pdf.setTextColor(255, 255, 255); // White text
  pdf.setFont("helvetica", "bold");
  pdf.text("AI Business Implementation Plan", 20, 32);

  // Reset colors and add details
  pdf.setTextColor(0, 0, 0);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text(`Date: ${new Date().toLocaleDateString()}`, 20, 49);

  // Add a subtle separator line
  pdf.setDrawColor(200, 220, 180);
  pdf.line(20, 52, 190, 52);
}

function addBrandedFooter(pdf: jsPDF) {
  const pageCount = pdf.getNumberOfPages();

  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);

    // Add green footer bar
    pdf.setFillColor(118, 185, 0); // Primary green #76B900
    pdf.rect(0, 285, 210, 12, "F");

    // Add footer text
    pdf.setFontSize(9);
    pdf.setTextColor(255, 255, 255); // White text
    pdf.setFont("helvetica", "bold");
    pdf.text("5Q Strategy - AI Implementation Specialists", 20, 292);

    // Add contact info
    pdf.setFontSize(7);
    pdf.setFont("helvetica", "normal");
    pdf.text("support@5qstrategy.com | 5qstrategy.com", 20, 296);

    // Add page number
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "bold");
    pdf.text(`Page ${i} of ${pageCount}`, 170, 292);

    // Reset colors
    pdf.setTextColor(0, 0, 0);
  }
}

function renderContentBlock(
  pdf: jsPDF,
  block: ContentBlock,
  yPosition: number,
  leftMargin: number,
  contentWidth: number,
  pageHeight: number
): number {
  const minElementHeight = 20; // Increased buffer for better spacing

  // Check if we need a new page with more generous spacing
  if (yPosition > pageHeight - minElementHeight) {
    pdf.addPage();
    yPosition = 30; // Start with more margin from top
  }

  switch (block.type) {
    case "header":
      return renderHeader(
        pdf,
        block,
        yPosition,
        leftMargin,
        contentWidth,
        pageHeight
      );

    case "paragraph":
      return renderParagraph(
        pdf,
        block,
        yPosition,
        leftMargin,
        contentWidth,
        pageHeight
      );

    case "list":
      return renderList(
        pdf,
        block,
        yPosition,
        leftMargin,
        contentWidth,
        pageHeight
      );

    case "table":
      return renderTable(
        pdf,
        block,
        yPosition,
        leftMargin,
        contentWidth,
        pageHeight
      );

    case "cta":
      return renderCTA(
        pdf,
        block,
        yPosition,
        leftMargin,
        contentWidth,
        pageHeight
      );

    default:
      return yPosition;
  }
}

function renderHeader(
  pdf: jsPDF,
  block: ContentBlock,
  yPosition: number,
  leftMargin: number,
  contentWidth: number,
  pageHeight: number
): number {
  const level = block.level || 1;
  const fontSize = level === 1 ? 16 : level === 2 ? 14 : 12;
  const lineHeight = 6;

  pdf.setFontSize(fontSize);
  pdf.setFont("helvetica", "bold");

  // Check if header fits on current page
  if (yPosition > pageHeight - 20) {
    pdf.addPage();
    yPosition = 25;
  }

  // Clean markdown formatting
  const cleanText = block.content
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1");

  // Calculate text width to size background properly
  const textWidth = pdf.getTextWidth(cleanText);
  const backgroundHeight = fontSize + 4;

  // Add green accent background - positioned correctly around text
  pdf.setFillColor(240, 249, 230); // Light green background
  pdf.rect(
    leftMargin - 2,
    yPosition - fontSize + 2,
    textWidth + 4,
    backgroundHeight,
    "F"
  );

  // Draw text on top of background
  pdf.text(cleanText, leftMargin, yPosition);

  // Reset font
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "normal");

  return yPosition + lineHeight + 12;
}

function renderParagraph(
  pdf: jsPDF,
  block: ContentBlock,
  yPosition: number,
  leftMargin: number,
  contentWidth: number,
  pageHeight: number
): number {
  const lineHeight = 6;

  pdf.setFontSize(12);
  pdf.setFont("helvetica", "normal");

  // Clean markdown formatting
  const cleanText = block.content
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1");

  const wrappedLines = pdf.splitTextToSize(cleanText, contentWidth);
  const textHeight = wrappedLines.length * lineHeight;

  // Check if text fits on current page
  if (yPosition + textHeight > pageHeight) {
    pdf.addPage();
    yPosition = 25;
  }

  wrappedLines.forEach((line: string) => {
    pdf.text(line, leftMargin, yPosition);
    yPosition += lineHeight;
  });

  return yPosition + 3; // Add small spacing
}

function renderList(
  pdf: jsPDF,
  block: ContentBlock,
  yPosition: number,
  leftMargin: number,
  contentWidth: number,
  pageHeight: number
): number {
  const lineHeight = 6;

  pdf.setFontSize(12);
  pdf.setFont("helvetica", "normal");

  if (!block.items) return yPosition;

  for (const item of block.items) {
    // Check if item fits on current page
    if (yPosition > pageHeight - 10) {
      pdf.addPage();
      yPosition = 25;
    }

    const cleanItem = item
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1");

    const wrappedLines = pdf.splitTextToSize(`• ${cleanItem}`, contentWidth);

    wrappedLines.forEach((line: string) => {
      pdf.text(line, leftMargin, yPosition);
      yPosition += lineHeight;
    });

    yPosition += 2; // Space between items
  }

  return yPosition + 3;
}

function renderTable(
  pdf: jsPDF,
  block: ContentBlock,
  yPosition: number,
  leftMargin: number,
  contentWidth: number,
  pageHeight: number
): number {
  if (!block.tableData) return yPosition;

  const { headers, rows } = block.tableData;

  // Calculate optimal column widths based on content
  const columnStyles: { [key: string]: any } = {};
  const maxColumnWidth = contentWidth / headers.length;

  headers.forEach((header, index) => {
    let maxLength = header.length;

    // Check all rows for this column to find max content length
    rows.forEach((row) => {
      if (row[index]) {
        maxLength = Math.max(maxLength, row[index].length);
      }
    });

    // Calculate width based on content, with minimum and maximum constraints
    const calculatedWidth = Math.max(
      25,
      Math.min(maxColumnWidth, maxLength * 1.2)
    );
    columnStyles[index] = { cellWidth: calculatedWidth };
  });

  // Use autoTable for better table rendering
  autoTable(pdf, {
    head: [headers],
    body: rows,
    startY: yPosition,
    margin: { left: leftMargin, right: 20 },
    styles: {
      fontSize: 9,
      cellPadding: 4,
      overflow: "linebreak",
      halign: "left",
    },
    headStyles: {
      fillColor: [118, 185, 0], // Primary green
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 10,
    },
    alternateRowStyles: {
      fillColor: [248, 249, 250],
    },
    columnStyles,
    didDrawPage: (data) => {
      // Ensure table doesn't exceed page boundaries
      if (data.cursor && data.cursor.y > pageHeight - 30) {
        return true; // Trigger page break
      }
    },
    didParseCell: (data) => {
      // Ensure text wrapping for long content
      if (data.cell.text && data.cell.text.length > 50) {
        data.cell.styles.overflow = "linebreak";
        data.cell.styles.cellWidth = "wrap";
      }
    },
  });

  return (pdf as any).lastAutoTable.finalY + 8;
}

function renderCTA(
  pdf: jsPDF,
  block: ContentBlock,
  yPosition: number,
  leftMargin: number,
  contentWidth: number,
  pageHeight: number
): number {
  const lineHeight = 6;
  const ctaHeight = 25;

  // Check if CTA fits on current page
  if (yPosition > pageHeight - ctaHeight) {
    pdf.addPage();
    yPosition = 30;
  }

  // Draw CTA background with gradient effect
  pdf.setFillColor(240, 249, 230); // Light green background
  pdf.rect(leftMargin, yPosition, contentWidth, ctaHeight, "F");

  // Draw border with rounded corners effect
  pdf.setDrawColor(118, 185, 0); // Primary green
  pdf.setLineWidth(2);
  pdf.rect(leftMargin, yPosition, contentWidth, ctaHeight);

  // Add simple text icon (no special characters)
  pdf.setFontSize(12);
  pdf.setTextColor(118, 185, 0);
  pdf.text(">", leftMargin + 5, yPosition + 8);

  // Add CTA title
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(118, 185, 0);
  pdf.text(
    "Recommended Browser for AI Strategy",
    leftMargin + 15,
    yPosition + 8
  );

  // Add description
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(0, 0, 0);
  const description =
    "We highly recommend Comet by Perplexity as the browser of choice for all our customers.";
  const wrappedDesc = pdf.splitTextToSize(description, contentWidth - 20);
  wrappedDesc.forEach((line: string, index: number) => {
    pdf.text(line, leftMargin + 15, yPosition + 12 + index * lineHeight);
  });

  // Add button-like area
  const buttonY = yPosition + 18;
  pdf.setFillColor(118, 185, 0); // Primary green button
  pdf.rect(leftMargin + 15, buttonY, 60, 6, "F");

  // Add button text
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(255, 255, 255);
  pdf.text("Try Comet Pro for Free", leftMargin + 18, buttonY + 4);

  // Add clickable link annotation (this makes it clickable in PDF viewers)
  try {
    pdf.link(leftMargin + 15, buttonY, 60, 6, {
      url: "https://pplx.ai/jack31428",
    });
  } catch (error) {
    console.log("Link annotation not supported, adding URL text instead");
    // Fallback: add URL text
    pdf.setFontSize(7);
    pdf.setTextColor(0, 0, 0);
    pdf.text("https://pplx.ai/jack31428", leftMargin + 15, buttonY + 8);
  }

  // Reset colors
  pdf.setTextColor(0, 0, 0);
  pdf.setFont("helvetica", "normal");
  pdf.setLineWidth(0.2);

  return yPosition + ctaHeight + 5;
}

export async function POST(req: NextRequest) {
  try {
    const { businessPlan, email } = await req.json();

    if (!businessPlan) {
      return NextResponse.json(
        { error: "Business plan content is required" },
        { status: 400 }
      );
    }

    // Generate PDF using the same logic as email attachments
    const pdfBase64 = generateBusinessPlanPDF(
      businessPlan,
      email || "user@example.com"
    );

    if (!pdfBase64) {
      return NextResponse.json(
        { error: "Failed to generate PDF" },
        { status: 500 }
      );
    }

    // Convert base64 to blob
    const pdfBuffer = Buffer.from(pdfBase64, "base64");

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="business-plan-${
          new Date().toISOString().split("T")[0]
        }.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
