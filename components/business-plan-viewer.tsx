"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Copy,
  Download,
  FileText,
  Check,
  Loader2,
  Lock,
  MessageCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Image from "next/image";
import { EmailGate } from "@/components/email-gate";
import { PerplexityCTA } from "@/components/perplexity-cta";

interface BusinessPlanViewerProps {
  markdown: string;
  onRestart: () => void;
  onContinueChat?: () => void;
  contextSummary?: any;
  chatMessages?: Array<{ role: string; content: string }>;
}

export function BusinessPlanViewer({
  markdown,
  onRestart,
  onContinueChat,
  contextSummary,
  chatMessages,
}: BusinessPlanViewerProps) {
  const [copied, setCopied] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isEmailSubmitted, setIsEmailSubmitted] = useState(false);
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false);
  const { toast } = useToast();
  const contentRef = useRef<HTMLDivElement>(null);

  // Split the markdown to show only the first section as preview
  const getPreviewContent = (fullMarkdown: string) => {
    const sections = fullMarkdown.split(/\n(?=##)/);
    if (sections.length > 1) {
      return sections[0] + "\n\n" + sections[1]; // Show first two sections
    }
    return fullMarkdown.substring(0, 1000) + "...";
  };

  const handleEmailSubmit = async (data: {
    email: string;
    firstName: string;
    lastName: string;
  }) => {
    setIsSubmittingEmail(true);
    try {
      const response = await fetch("/api/send-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          businessPlan: markdown,
          contextSummary,
          chatMessages,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send email");
      }

      setIsEmailSubmitted(true);
    } catch (error) {
      console.error("Error sending email:", error);
      throw error;
    } finally {
      setIsSubmittingEmail(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      toast({
        title: "Copied to clipboard",
        description: "Business plan has been copied to your clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Could not copy to clipboard. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadMarkdown = () => {
    const blob = new Blob([markdown], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "business-plan.md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Markdown downloaded",
      description: "Your business plan markdown file is being downloaded",
    });
  };

  const generatePDF = async () => {
    setIsGeneratingPdf(true);

    try {
      // Dynamic import to avoid SSR issues
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import("jspdf"),
        import("html2canvas"),
      ]);

      if (!contentRef.current) {
        throw new Error("Content reference not found");
      }

      // Create a temporary container with better styling for PDF
      const tempContainer = document.createElement("div");
      tempContainer.style.position = "absolute";
      tempContainer.style.left = "-9999px";
      tempContainer.style.top = "0";
      tempContainer.style.width = "210mm"; // A4 width
      tempContainer.style.padding = "20mm";
      tempContainer.style.backgroundColor = "white";
      tempContainer.style.fontFamily = "Arial, sans-serif";
      tempContainer.style.fontSize = "12px";
      tempContainer.style.lineHeight = "1.6";
      tempContainer.style.color = "#000000";

      // Clone the content and style it for PDF
      const clonedContent = contentRef.current.cloneNode(true) as HTMLElement;

      // Apply PDF-specific styles
      const styleElement = document.createElement("style");
      styleElement.textContent = `
        h1 { font-size: 24px; margin: 20px 0 15px 0; color: #000; border-bottom: 2px solid #000; padding-bottom: 5px; }
        h2 { font-size: 20px; margin: 18px 0 12px 0; color: #000; }
        h3 { font-size: 16px; margin: 15px 0 10px 0; color: #000; }
        h4 { font-size: 14px; margin: 12px 0 8px 0; color: #000; }
        p { margin: 8px 0; }
        ul, ol { margin: 8px 0; padding-left: 20px; }
        li { margin: 4px 0; }
        strong { font-weight: bold; }
        em { font-style: italic; }
        code { background-color: #f5f5f5; padding: 2px 4px; border-radius: 3px; }
        blockquote { border-left: 4px solid #ccc; margin: 10px 0; padding-left: 15px; font-style: italic; }
        hr { border: none; border-top: 1px solid #ccc; margin: 20px 0; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 11px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f5f5f5; font-weight: bold; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        .prose { max-width: none !important; }
      `;

      tempContainer.appendChild(styleElement);
      tempContainer.appendChild(clonedContent);
      document.body.appendChild(tempContainer);

      // Generate canvas from the styled content
      const canvas = await html2canvas(tempContainer, {
        scale: 2, // Higher resolution
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        width: tempContainer.scrollWidth,
        height: tempContainer.scrollHeight,
      });

      // Remove temporary container
      document.body.removeChild(tempContainer);

      // Create PDF
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const imgData = canvas.toDataURL("image/png");
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add additional pages if content is longer than one page
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split("T")[0];
      const filename = `business-plan-${timestamp}.pdf`;

      // Download the PDF
      pdf.save(filename);

      toast({
        title: "PDF Generated!",
        description: "Your business plan PDF has been downloaded successfully",
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "PDF Generation Failed",
        description:
          "Could not generate PDF. Try downloading as markdown instead.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="flex flex-col space-y-4 w-full max-w-4xl mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <Image
            src="/logo.png"
            alt="5Q Logo"
            width={40}
            height={40}
            className="rounded-lg"
          />
          <h2 className="text-2xl font-bold text-primary">
            Your Business Plan
          </h2>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="default"
            size="sm"
            onClick={onRestart}
            className="bg-primary hover:bg-primary/90"
          >
            Start Over
          </Button>
        </div>
      </div>

      {/* Perplexity CTA */}
      <PerplexityCTA variant="inline" className="mb-6" />

      {!isEmailSubmitted ? (
        <div className="space-y-6">
          {/* Preview Content */}
          <Card className="w-full">
            <CardHeader className="bg-muted/50 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Lock className="h-5 w-5 text-amber-500" />
                Business Plan Preview
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Here's a preview of your personalized AI business plan
              </p>
            </CardHeader>
            <CardContent className="pt-6 pb-8 px-6">
              <div className="prose dark:prose-invert max-w-none space-y-6">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ children }) => (
                      <h1 className="text-3xl font-bold mb-6 pb-3 border-b-2 border-primary/20 mt-8 first:mt-0">
                        {children}
                      </h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-2xl font-semibold mb-4 mt-8 text-primary">
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-xl font-semibold mb-3 mt-6 text-gray-800 dark:text-gray-200">
                        {children}
                      </h3>
                    ),
                    h4: ({ children }) => (
                      <h4 className="text-lg font-semibold mb-2 mt-4 text-gray-700 dark:text-gray-300">
                        {children}
                      </h4>
                    ),
                    ul: ({ children }) => (
                      <ul className="list-disc pl-6 mb-6 space-y-2">
                        {children}
                      </ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="list-decimal pl-6 mb-6 space-y-2">
                        {children}
                      </ol>
                    ),
                    li: ({ children }) => (
                      <li className="leading-relaxed">{children}</li>
                    ),
                    p: ({ children }) => (
                      <p className="mb-4 leading-relaxed text-gray-700 dark:text-gray-300">
                        {children}
                      </p>
                    ),
                    strong: ({ children }) => (
                      <strong className="font-semibold text-gray-900 dark:text-gray-100">
                        {children}
                      </strong>
                    ),
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-4 border-primary/30 pl-4 italic my-6 text-gray-600 dark:text-gray-400 bg-muted/30 py-2">
                        {children}
                      </blockquote>
                    ),
                    hr: () => (
                      <hr className="my-8 border-gray-200 dark:border-gray-700" />
                    ),
                    table: ({ children }) => (
                      <div className="my-6 overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg">
                          {children}
                        </table>
                      </div>
                    ),
                    thead: ({ children }) => (
                      <thead className="bg-gray-50 dark:bg-gray-800">
                        {children}
                      </thead>
                    ),
                    tbody: ({ children }) => (
                      <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                        {children}
                      </tbody>
                    ),
                    tr: ({ children }) => (
                      <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        {children}
                      </tr>
                    ),
                    th: ({ children }) => (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {children}
                      </th>
                    ),
                    td: ({ children }) => (
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                        <div className="max-w-xs break-words">{children}</div>
                      </td>
                    ),
                    a: ({ href, children }) => {
                      // Check if this is the Perplexity CTA link
                      if (href === "https://pplx.ai/jack31428") {
                        return (
                          <div className="text-center my-6">
                            <a
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition-colors duration-200"
                            >
                              {children}
                            </a>
                          </div>
                        );
                      }
                      // Regular link styling
                      return (
                        <a
                          href={href}
                          className="text-blue-600 hover:text-blue-800 underline"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {children}
                        </a>
                      );
                    },
                  }}
                >
                  {getPreviewContent(markdown)}
                </ReactMarkdown>
              </div>

              {/* Blur overlay */}
              <div className="relative -mt-8 pt-8 bg-gradient-to-t from-background via-background/80 to-transparent">
                <div className="absolute inset-0 backdrop-blur-sm"></div>
                <div className="relative text-center py-8">
                  <Lock className="h-8 w-8 mx-auto text-amber-500 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Enter your email to unlock the complete plan, download as
                    PDF, and receive it in your inbox
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Email Gate */}
          <EmailGate
            onEmailSubmit={handleEmailSubmit}
            isLoading={isSubmittingEmail}
          />
        </div>
      ) : (
        /* Full Content After Email Submission */
        <Card className="w-full">
          <CardHeader className="bg-green-50 dark:bg-green-900/20 pb-4">
            <CardTitle className="text-lg flex items-center gap-2 text-green-700 dark:text-green-400">
              <Check className="h-5 w-5" />
              Complete Business Plan Unlocked!
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Your full business plan has been sent to your email. You can also
              download it below.
            </p>
          </CardHeader>
          <CardContent className="pt-6 pb-8 px-6">
            <div className="flex flex-wrap gap-2 mb-6">
              <Button variant="outline" size="sm" onClick={handleCopy}>
                {copied ? (
                  <Check className="h-4 w-4 mr-2" />
                ) : (
                  <Copy className="h-4 w-4 mr-2" />
                )}
                {copied ? "Copied" : "Copy Text"}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={generatePDF}
                disabled={isGeneratingPdf}
              >
                {isGeneratingPdf ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Download PDF
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadMarkdown}
              >
                <Download className="h-4 w-4 mr-2" />
                Download MD
              </Button>

              {onContinueChat && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={onContinueChat}
                  className="bg-primary hover:bg-primary/90"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Continue Discussing
                </Button>
              )}
            </div>

            <div
              ref={contentRef}
              className="prose dark:prose-invert max-w-none space-y-6"
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => (
                    <h1 className="text-3xl font-bold mb-6 pb-3 border-b-2 border-primary/20 mt-8 first:mt-0">
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-2xl font-semibold mb-4 mt-8 text-primary">
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-xl font-semibold mb-3 mt-6 text-gray-800 dark:text-gray-200">
                      {children}
                    </h3>
                  ),
                  h4: ({ children }) => (
                    <h4 className="text-lg font-semibold mb-2 mt-4 text-gray-700 dark:text-gray-300">
                      {children}
                    </h4>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc pl-6 mb-6 space-y-2">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal pl-6 mb-6 space-y-2">
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => (
                    <li className="leading-relaxed">{children}</li>
                  ),
                  p: ({ children }) => (
                    <p className="mb-4 leading-relaxed text-gray-700 dark:text-gray-300">
                      {children}
                    </p>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold text-gray-900 dark:text-gray-100">
                      {children}
                    </strong>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-primary/30 pl-4 italic my-6 text-gray-600 dark:text-gray-400 bg-muted/30 py-2">
                      {children}
                    </blockquote>
                  ),
                  hr: () => (
                    <hr className="my-8 border-gray-200 dark:border-gray-700" />
                  ),
                  table: ({ children }) => (
                    <div className="my-6 overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg">
                        {children}
                      </table>
                    </div>
                  ),
                  thead: ({ children }) => (
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      {children}
                    </thead>
                  ),
                  tbody: ({ children }) => (
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                      {children}
                    </tbody>
                  ),
                  tr: ({ children }) => (
                    <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      {children}
                    </tr>
                  ),
                  th: ({ children }) => (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                      <div className="max-w-xs break-words">{children}</div>
                    </td>
                  ),
                  a: ({ href, children }) => {
                    // Check if this is the Perplexity CTA link
                    if (href === "https://pplx.ai/jack31428") {
                      return (
                        <div className="text-center my-6">
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition-colors duration-200"
                          >
                            {children}
                          </a>
                        </div>
                      );
                    }
                    // Regular link styling
                    return (
                      <a
                        href={href}
                        className="text-blue-600 hover:text-blue-800 underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {children}
                      </a>
                    );
                  },
                }}
              >
                {markdown}
              </ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
