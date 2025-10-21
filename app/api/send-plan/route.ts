import { type NextRequest, NextResponse } from "next/server";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { withDatabaseIntegration } from "../../../lib/db/integration";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FORWARD_EMAIL = "carlsonjack455@gmail.com";

interface EmailData {
  email: string;
  firstName: string;
  lastName: string;
  businessPlan: string;
  contextSummary: any;
  chatMessages?: Array<{ role: string; content: string }>;
  userInfo?: {
    businessType?: string;
    painPoints?: string;
    goals?: string;
  };
}

async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text: string,
  attachments?: Array<{
    filename: string;
    content: string;
    type: string;
  }>
) {
  if (!RESEND_API_KEY) {
    console.log("RESEND_API_KEY not set, would send email:", { to, subject });
    return { success: true, id: "mock-email-id" };
  }

  console.log("🔄 Sending email via Resend API...", {
    to,
    subject,
    from: "5Q Strategy <jack@5qstrategy.com>",
    apiKeyPrefix: RESEND_API_KEY.substring(0, 8) + "...",
  });

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "5Q Strategy <jack@5qstrategy.com>",
      to: [to],
      subject,
      html,
      text,
      headers: {
        "X-Entity-Ref-ID": `5q-strategy-${Date.now()}`,
        "List-Unsubscribe": "<mailto:jack@5qstrategy.com?subject=Unsubscribe>",
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
      tags: [
        {
          name: "category",
          value: "business-plan",
        },
      ],
      ...(attachments && { attachments }),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Resend API error:", {
      status: response.status,
      statusText: response.statusText,
      error,
      headers: Object.fromEntries(response.headers as any),
      url: response.url,
      to,
      subject,
    });

    // Provide more specific error messages
    if (response.status === 401) {
      throw new Error(
        `Email sending failed: Invalid API key (${response.status})`
      );
    } else if (response.status === 429) {
      throw new Error(
        `Email sending failed: Rate limit exceeded (${response.status})`
      );
    } else if (response.status === 422) {
      throw new Error(
        `Email sending failed: Invalid email content or format (${response.status})`
      );
    } else {
      throw new Error(`Email sending failed: ${response.status} - ${error}`);
    }
  }

  const result = await response.json();
  console.log("Email sent successfully:", { id: result.id, to });
  return result;
}

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

function convertMarkdownToHtmlForPDF(markdown: string): string {
  const lines = markdown.split("\n");
  let html = "";
  let inTable = false;
  let tableRows: string[][] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Check if this is a table row
    if (line.includes("|") && line.split("|").length > 2) {
      if (!inTable) {
        inTable = true;
        tableRows = [];
      }

      // Parse table row
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

      // Skip separator rows (containing only dashes)
      if (cells.every((cell) => /^-+$/.test(cell))) {
        continue;
      }

      tableRows.push(cells);
    } else {
      // End of table, render it
      if (inTable && tableRows.length > 0) {
        html += renderTableHtmlForPDF(tableRows);
        inTable = false;
        tableRows = [];
      }

      // Handle regular content
      if (line) {
        // Handle headers
        if (line.startsWith("#")) {
          const headerText = line.replace(/^#+\s*/, "");
          const level = line.match(/^#+/)?.[0].length || 1;
          const tag = `h${Math.min(level, 6)}`;
          html += `<${tag}>${headerText}</${tag}>`;
        } else {
          // Handle regular text
          const processedLine = line
            .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
            .replace(/\*(.*?)\*/g, "<em>$1</em>")
            .replace(/^\s*[\-\*\+]\s+/, "• ")
            // Fix CTA markdown links - convert [text](url) to clean text
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)");

          html += `<p>${processedLine}</p>`;
        }
      } else {
        // Empty line
        html += "<br>";
      }
    }
  }

  // Render any remaining table
  if (inTable && tableRows.length > 0) {
    html += renderTableHtmlForPDF(tableRows);
  }

  return html;
}

function renderTableHtmlForPDF(rows: string[][]): string {
  if (rows.length === 0) return "";

  let tableHtml = "<table>";

  rows.forEach((row, index) => {
    const isHeader = index === 0;
    const tag = isHeader ? "th" : "td";

    tableHtml += `<tr>`;
    row.forEach((cell) => {
      tableHtml += `<${tag}>${cell}</${tag}>`;
    });
    tableHtml += `</tr>`;
  });

  tableHtml += "</table>";
  return tableHtml;
}

function generateChatSummary(
  chatMessages?: Array<{ role: string; content: string }>
): string {
  if (!chatMessages || chatMessages.length === 0) {
    return "No chat conversation available.";
  }

  let summary = "Chat Conversation Summary:\n\n";

  chatMessages.forEach((message, index) => {
    const role = message.role === "user" ? "User" : "Assistant";
    // Include full content without truncation
    const content = message.content;

    summary += `${role}: ${content}\n\n`;
  });

  return summary;
}

function generateBusinessPlanEmail(data: EmailData) {
  const { businessPlan, contextSummary, userInfo, firstName, lastName } = data;

  // Convert markdown to HTML for proper email formatting
  const convertMarkdownToHtml = (markdown: string): string => {
    const lines = markdown.split("\n");
    let html = "";
    let inTable = false;
    let tableRows: string[][] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Check if this is a table row
      if (line.includes("|") && line.split("|").length > 2) {
        if (!inTable) {
          inTable = true;
          tableRows = [];
        }

        // Parse table row
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

        // Skip separator rows (containing only dashes)
        if (cells.every((cell) => /^-+$/.test(cell))) {
          continue;
        }

        tableRows.push(cells);
      } else {
        // End of table, render it
        if (inTable && tableRows.length > 0) {
          html += renderTableHtml(tableRows);
          inTable = false;
          tableRows = [];
        }

        // Handle regular content
        if (line) {
          // Handle headers
          if (line.startsWith("#")) {
            const headerText = line.replace(/^#+\s*/, "");
            const level = line.match(/^#+/)?.[0].length || 1;
            const tag = `h${Math.min(level, 6)}`;
            const styles = {
              1: "color: #495057; margin: 30px 0 25px 0; font-size: 24px; font-weight: 700;",
              2: "color: #495057; margin: 25px 0 20px 0; font-size: 20px; font-weight: 600; border-bottom: 2px solid #e9ecef; padding-bottom: 10px;",
              3: "color: #495057; margin: 20px 0 15px 0; font-size: 18px; font-weight: 600;",
            };
            html += `<${tag} style="${
              styles[level as keyof typeof styles] || styles[3]
            }">${headerText}</${tag}>`;
          } else {
            // Handle regular text
            const processedLine = line
              .replace(
                /\*\*(.*?)\*\*/g,
                '<strong style="font-weight: 600; color: #212529;">$1</strong>'
              )
              .replace(/\*(.*?)\*/g, '<em style="font-style: italic;">$1</em>')
              .replace(/^\s*[\-\*\+]\s+/, "• ")
              // Fix CTA markdown links - convert [text](url) to clean links
              .replace(
                /\[([^\]]+)\]\(([^)]+)\)/g,
                '<a href="$2" style="color: #2563eb; text-decoration: underline;">$1</a>'
              );

            html += `<p style="margin: 15px 0; line-height: 1.6;">${processedLine}</p>`;
          }
        } else {
          // Empty line
          html += "<br>";
        }
      }
    }

    // Render any remaining table
    if (inTable && tableRows.length > 0) {
      html += renderTableHtml(tableRows);
    }

    return html;
  };

  // Helper function to render table HTML
  const renderTableHtml = (rows: string[][]): string => {
    if (rows.length === 0) return "";

    let tableHtml =
      '<table style="width: 100%; border-collapse: collapse; margin: 20px 0; border: 1px solid #e9ecef;">';

    rows.forEach((row, index) => {
      const isHeader = index === 0;
      const tag = isHeader ? "th" : "td";
      const cellStyle = isHeader
        ? "background-color: #f8f9fa; font-weight: 600; padding: 12px 8px; border: 1px solid #e9ecef; text-align: left; font-size: 14px;"
        : "padding: 10px 8px; border: 1px solid #e9ecef; font-size: 13px;";

      tableHtml += `<tr>`;
      row.forEach((cell) => {
        tableHtml += `<${tag} style="${cellStyle}">${cell}</${tag}>`;
      });
      tableHtml += `</tr>`;
    });

    tableHtml += "</table>";
    return tableHtml;
  };

  const cleanedBusinessPlan = convertMarkdownToHtml(businessPlan);

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your AI Business Implementation Plan</title>
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
          line-height: 1.6; 
          color: #333333; 
          max-width: 600px; 
          margin: 0 auto; 
          padding: 20px;
          background-color: #ffffff;
        }
        .header { 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
          color: white; 
          padding: 30px; 
          border-radius: 8px; 
          margin-bottom: 30px; 
          text-align: center; 
        }
        .header h1 { margin: 0 0 10px 0; font-size: 24px; font-weight: 600; }
        .header p { margin: 0; font-size: 16px; opacity: 0.9; }
        .content { 
          background: #f8f9fa; 
          padding: 30px; 
          border-radius: 8px; 
          margin-bottom: 20px; 
        }
        .plan-content { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          font-size: 16px; 
          line-height: 1.6;
          background: white;
          padding: 30px;
          border-radius: 8px;
          border: 1px solid #e9ecef;
          color: #333333;
        }
        .plan-content h1, .plan-content h2, .plan-content h3 {
          margin-top: 0;
        }
        .plan-content ul, .plan-content ol {
          margin: 15px 0;
          padding-left: 20px;
        }
        .plan-content li {
          margin: 8px 0;
        }
        .plan-content p {
          margin: 15px 0;
        }
        .footer { 
          text-align: center; 
          color: #6c757d; 
          font-size: 13px; 
          margin-top: 30px; 
          padding: 20px;
          border-top: 1px solid #e9ecef;
        }
        .highlight { 
          background: #fff3cd; 
          padding: 20px; 
          border-left: 4px solid #ffc107; 
          margin: 20px 0; 
          border-radius: 4px;
        }
        .highlight h3 { margin-top: 0; color: #856404; }
        .company-info { margin-bottom: 15px; }
        .company-info p { margin: 5px 0; }
        .unsubscribe { 
          margin-top: 20px; 
          font-size: 12px; 
          color: #868e96; 
        }
        .unsubscribe a { color: #6c757d; text-decoration: underline; }
        @media only screen and (max-width: 600px) {
          body { padding: 10px; }
          .header, .content { padding: 20px; }
        }
      </style>
    </head>
    <body>
             <div class="header">
               <h1>Your AI Business Implementation Plan</h1>
               <p>Customized strategy roadmap for ${firstName} ${lastName}'s business growth</p>
             </div>
      
      <div class="content">
        <div class="highlight">
          <h3>Business Profile Summary</h3>
          <div class="company-info">
            <p><strong>Business Type:</strong> ${
              contextSummary?.businessType ||
              userInfo?.businessType ||
              "Not specified"
            }</p>
            <p><strong>Key Challenges:</strong> ${
              contextSummary?.painPoints ||
              userInfo?.painPoints ||
              "Not specified"
            }</p>
            <p><strong>Goals:</strong> ${
              contextSummary?.goals || userInfo?.goals || "Not specified"
            }</p>
          </div>
        </div>
        
        <h2 style="color: #495057; margin-bottom: 20px;">Your Complete Implementation Plan</h2>
        <div class="plan-content">${cleanedBusinessPlan}</div>
        
        <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
          <h3 style="color: #155724; margin-top: 0; margin-bottom: 10px;">📎 PDF Attachment Included</h3>
          <p style="margin: 0; color: #155724;">A professional PDF version of your business plan is attached to this email for easy sharing with your team and stakeholders.</p>
        </div>
        
        <div style="background: linear-gradient(135deg, #e0f2fe 0%, #e0e7ff 100%); padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #bfdbfe;">
          <div style="display: flex; align-items: center; margin-bottom: 15px;">
            <img src="https://5qstrategy.com/perplexity-comet.webp" alt="Perplexity Comet Logo" style="width: 32px; height: 32px; border-radius: 6px; margin-right: 12px;">
            <div>
              <h3 style="color: #1e40af; margin: 0; font-size: 16px; font-weight: 600;">Recommended Browser</h3>
              <p style="color: #3b82f6; margin: 0; font-size: 12px;">Enhanced AI experience</p>
            </div>
          </div>
          <p style="color: #1e40af; margin: 0 0 15px 0; font-size: 13px; line-height: 1.5;">
            We highly recommend Comet by Perplexity as the browser of choice for all our customers. Get the most out of your AI strategy with Comet.
          </p>
          <a href="https://pplx.ai/jack31428" style="display: inline-flex; align-items: center; justify-content: center; padding: 10px 16px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-size: 13px; font-weight: 500; transition: background-color 0.2s;">
            ✨ Try Comet Pro for Free
          </a>
        </div>
      </div>
      
      <div class="footer">
        <p><strong>5Q Strategy</strong> - AI Implementation Specialists</p>
        <p>This plan was generated based on your specific business requirements.</p>
        <p>Questions? Reply to this email or contact us at <a href="mailto:support@5qstrategy.com" style="color: #667eea;">support@5qstrategy.com</a></p>
        
        <div class="unsubscribe">
          <p>You received this email because you requested an AI business plan on 5qstrategy.com</p>
          <p>5Q Strategy, Business AI Solutions</p>
          <p><a href="mailto:jack@5qstrategy.com?subject=Unsubscribe">Unsubscribe</a> | <a href="mailto:support@5qstrategy.com">Contact Support</a></p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
       5Q Strategy - Your AI Business Implementation Plan
       
       Hello ${firstName},
       
       Thank you for using our AI business planning service. Your customized implementation plan is ready for review.

BUSINESS PROFILE SUMMARY:
- Business Type: ${
    contextSummary?.businessType || userInfo?.businessType || "Not specified"
  }
- Key Challenges: ${
    contextSummary?.painPoints || userInfo?.painPoints || "Not specified"
  }
- Goals: ${contextSummary?.goals || userInfo?.goals || "Not specified"}

YOUR COMPLETE IMPLEMENTATION PLAN:
${businessPlan}

PDF ATTACHMENT:
A professional PDF version of your business plan is attached to this email for easy sharing with your team and stakeholders.

RECOMMENDED BROWSER:
We highly recommend Comet by Perplexity as the browser of choice for all our customers. Get the most out of your AI strategy with Comet's enhanced AI capabilities.

Try Comet Pro for Free: https://pplx.ai/jack31428

NEXT STEPS:
This plan was generated based on your specific business requirements. Our implementation team will contact you within 24 hours to discuss next steps and answer any questions.

CONTACT INFORMATION:
Questions? Reply to this email or contact us at support@5qstrategy.com

ABOUT 5Q STRATEGY:
We are AI Implementation Specialists helping businesses integrate artificial intelligence solutions for growth and efficiency.

You received this email because you requested an AI business plan on 5qstrategy.com

To unsubscribe or contact support: support@5qstrategy.com
5Q Strategy - Business AI Solutions
  `;

  return { html, text };
}

function generateLeadNotificationEmail(data: EmailData) {
  const { email, firstName, lastName, contextSummary, userInfo, chatMessages } =
    data;

  const chatSummary = generateChatSummary(chatMessages);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>New Lead - AI Business Plan</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { background: #dc2626; color: white; padding: 20px; border-radius: 10px; margin-bottom: 20px; text-align: center; }
        .lead-info { background: #f3f4f6; padding: 20px; border-radius: 10px; margin-bottom: 20px; }
        .cta { background: #059669; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; display: inline-block; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>New Lead Captured!</h1>
        <p>AI Business Plan Generator</p>
      </div>
      
             <div class="lead-info">
               <h2>Lead Information</h2>
               <p><strong>Name:</strong> ${firstName} ${lastName}</p>
               <p><strong>Email:</strong> ${email}</p>
        <p><strong>Business Type:</strong> ${
          contextSummary?.businessType ||
          userInfo?.businessType ||
          "Not specified"
        }</p>
        <p><strong>Pain Points:</strong> ${
          contextSummary?.painPoints || userInfo?.painPoints || "Not specified"
        }</p>
        <p><strong>Goals:</strong> ${
          contextSummary?.goals || userInfo?.goals || "Not specified"
        }</p>
        <p><strong>Data Available:</strong> ${
          contextSummary?.dataAvailable || "Not specified"
        }</p>
        <p><strong>Prior Tech Use:</strong> ${
          contextSummary?.priorTechUse || "Not specified"
        }</p>
        <p><strong>Growth Intent:</strong> ${
          contextSummary?.growthIntent || "Not specified"
        }</p>
        <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
      </div>
      
      <div class="lead-info">
        <h2>Chat Conversation Summary</h2>
        <div style="background: white; padding: 15px; border-radius: 5px; font-family: monospace; font-size: 12px; max-height: 400px; overflow-y: auto; white-space: pre-wrap;">${chatSummary}</div>
      </div>
      
      <div style="text-align: center;">
        <p><strong>Business Plan PDF attached for review</strong></p>
        <a href="mailto:${email}" class="cta">Contact Lead</a>
      </div>
    </body>
    </html>
  `;

  const text = `
       New Lead Captured - AI Business Plan Generator
       
       Lead Information:
       - Name: ${firstName} ${lastName}
       - Email: ${email}
- Business Type: ${
    contextSummary?.businessType || userInfo?.businessType || "Not specified"
  }
- Pain Points: ${
    contextSummary?.painPoints || userInfo?.painPoints || "Not specified"
  }
- Goals: ${contextSummary?.goals || userInfo?.goals || "Not specified"}
- Data Available: ${contextSummary?.dataAvailable || "Not specified"}
- Prior Tech Use: ${contextSummary?.priorTechUse || "Not specified"}
- Growth Intent: ${contextSummary?.growthIntent || "Not specified"}
- Timestamp: ${new Date().toLocaleString()}

Chat Conversation Summary:
${chatSummary}

Business Plan PDF attached for review.

Contact: ${email}
  `;

  return { html, text };
}

export async function POST(req: NextRequest) {
  return withDatabaseIntegration(req, async (db) => {
    try {
      const {
        email,
        firstName,
        lastName,
        businessPlan,
        contextSummary,
        userInfo,
        chatMessages,
      } = await req.json();

      if (!email || !firstName || !lastName || !businessPlan) {
        return NextResponse.json(
          {
            error:
              "Email, first name, last name, and business plan are required",
          },
          { status: 400 }
        );
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { error: "Invalid email format" },
          { status: 400 }
        );
      }

      // Validate business plan content length and structure
      if (!businessPlan || businessPlan.trim().length === 0) {
        return NextResponse.json(
          { error: "Business plan content is empty" },
          { status: 400 }
        );
      }

      console.log("Business plan length:", businessPlan.length, "characters");

      // Track email sending event
      await db.trackEvent("email", "plan_send_request", {
        email: email,
        firstName: firstName,
        lastName: lastName,
        planLength: businessPlan.length,
        hasContextSummary: !!contextSummary,
        hasUserInfo: !!userInfo,
        hasChatMessages: !!(chatMessages && chatMessages.length > 0),
      });

      const emailData: EmailData = {
        email,
        firstName,
        lastName,
        businessPlan,
        contextSummary,
        userInfo,
        chatMessages,
      };

      // Send business plan to user
      try {
        console.log("Generating user email...");
        const userEmail = generateBusinessPlanEmail(emailData);

        // Generate PDF attachment for user
        console.log("Generating PDF attachment for user...");
        const pdfContent = generateBusinessPlanPDF(businessPlan, email);
        const userAttachments = pdfContent
          ? [
              {
                filename: `business-plan-${firstName}-${lastName}-${
                  new Date().toISOString().split("T")[0]
                }.pdf`,
                content: pdfContent,
                type: "application/pdf",
              },
            ]
          : undefined;

        console.log("Sending business plan to user:", email);
        const userEmailResult = await sendEmail(
          email,
          "Your AI Implementation Plan - 5Q Strategy",
          userEmail.html,
          userEmail.text,
          userAttachments
        );
        console.log("User email sent successfully");

        // Log email event for user
        await db.logEmailEvent({
          toEmail: email,
          fromEmail: "5Q Strategy <jack@5qstrategy.com>",
          subject: "Your AI Implementation Plan - 5Q Strategy",
          emailType: "business_plan",
          messageId: userEmailResult.id,
          status: "sent",
          provider: "resend",
        });
      } catch (error) {
        console.error("Failed to send user email:", error);

        // Log failed email event
        await db.logEmailEvent({
          toEmail: email,
          fromEmail: "5Q Strategy <jack@5qstrategy.com>",
          subject: "Your AI Implementation Plan - 5Q Strategy",
          emailType: "business_plan",
          status: "failed",
          provider: "resend",
          errorMessage: error instanceof Error ? error.message : String(error),
        });

        throw new Error(
          `Failed to send business plan to user: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }

      // Send lead notification to forward email
      try {
        console.log("Generating lead notification email...");
        const leadEmail = generateLeadNotificationEmail(emailData);

        // Generate PDF attachment
        console.log("Generating PDF attachment...");
        const pdfContent = generateBusinessPlanPDF(businessPlan, email);
        const attachments = pdfContent
          ? [
              {
                filename: `business-plan-${email.split("@")[0]}-${
                  new Date().toISOString().split("T")[0]
                }.pdf`,
                content: pdfContent,
                type: "application/pdf",
              },
            ]
          : undefined;

        console.log("Sending lead notification to:", FORWARD_EMAIL);
        const leadEmailResult = await sendEmail(
          FORWARD_EMAIL,
          `New Lead: ${email} - AI Business Plan`,
          leadEmail.html,
          leadEmail.text,
          attachments
        );
        console.log("Lead notification sent successfully");

        // Log email event for lead notification
        await db.logEmailEvent({
          toEmail: FORWARD_EMAIL,
          fromEmail: "5Q Strategy <jack@5qstrategy.com>",
          subject: `New Lead: ${email} - AI Business Plan`,
          emailType: "lead_notification",
          messageId: leadEmailResult.id,
          status: "sent",
          provider: "resend",
        });
      } catch (error) {
        console.error("Failed to send lead notification:", error);

        // Log failed lead notification email event
        await db.logEmailEvent({
          toEmail: FORWARD_EMAIL,
          fromEmail: "5Q Strategy <jack@5qstrategy.com>",
          subject: `New Lead: ${email} - AI Business Plan`,
          emailType: "lead_notification",
          status: "failed",
          provider: "resend",
          errorMessage: error instanceof Error ? error.message : String(error),
        });

        // Don't throw here - user email was successful, so we can continue
        console.log("Continuing despite lead notification failure");
      }

      console.log("Email sending process completed");

      // Track successful email completion
      await db.trackEvent("email", "plan_send_completed", {
        email: email,
        firstName: firstName,
        lastName: lastName,
        planLength: businessPlan.length,
      });

      return NextResponse.json({
        success: true,
        message: "Business plan sent successfully",
      });
    } catch (error) {
      console.error("Error sending business plan:", error);

      // Log system health for debugging
      await db.logSystemHealth({
        service: "send_plan_api",
        endpoint: "/api/send-plan",
        method: "POST",
        success: false,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorType: "api_error",
      });

      return NextResponse.json(
        {
          error: "Failed to send business plan",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 }
      );
    }
  });
}
