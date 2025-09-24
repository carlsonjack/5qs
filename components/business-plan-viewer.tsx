"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Copy, Download, FileText, Check, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import ReactMarkdown from "react-markdown"
import Image from "next/image"

interface BusinessPlanViewerProps {
  markdown: string
  onRestart: () => void
}

export function BusinessPlanViewer({ markdown, onRestart }: BusinessPlanViewerProps) {
  const [copied, setCopied] = useState(false)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const { toast } = useToast()
  const contentRef = useRef<HTMLDivElement>(null)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(markdown)
      setCopied(true)
      toast({
        title: "Copied to clipboard",
        description: "Business plan has been copied to your clipboard",
      })
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Could not copy to clipboard. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDownloadMarkdown = () => {
    const blob = new Blob([markdown], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "business-plan.md"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: "Markdown downloaded",
      description: "Your business plan markdown file is being downloaded",
    })
  }

  const generatePDF = async () => {
    setIsGeneratingPdf(true)

    try {
      // Dynamic import to avoid SSR issues
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([import("jspdf"), import("html2canvas")])

      if (!contentRef.current) {
        throw new Error("Content reference not found")
      }

      // Create a temporary container with better styling for PDF
      const tempContainer = document.createElement("div")
      tempContainer.style.position = "absolute"
      tempContainer.style.left = "-9999px"
      tempContainer.style.top = "0"
      tempContainer.style.width = "210mm" // A4 width
      tempContainer.style.padding = "20mm"
      tempContainer.style.backgroundColor = "white"
      tempContainer.style.fontFamily = "Arial, sans-serif"
      tempContainer.style.fontSize = "12px"
      tempContainer.style.lineHeight = "1.6"
      tempContainer.style.color = "#000000"

      // Clone the content and style it for PDF
      const clonedContent = contentRef.current.cloneNode(true) as HTMLElement

      // Apply PDF-specific styles
      const styleElement = document.createElement("style")
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
        .prose { max-width: none !important; }
      `

      tempContainer.appendChild(styleElement)
      tempContainer.appendChild(clonedContent)
      document.body.appendChild(tempContainer)

      // Generate canvas from the styled content
      const canvas = await html2canvas(tempContainer, {
        scale: 2, // Higher resolution
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        width: tempContainer.scrollWidth,
        height: tempContainer.scrollHeight,
      })

      // Remove temporary container
      document.body.removeChild(tempContainer)

      // Create PDF
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      })

      const imgData = canvas.toDataURL("image/png")
      const imgWidth = 210 // A4 width in mm
      const pageHeight = 297 // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight
      let position = 0

      // Add first page
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight

      // Add additional pages if content is longer than one page
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split("T")[0]
      const filename = `business-plan-${timestamp}.pdf`

      // Download the PDF
      pdf.save(filename)

      toast({
        title: "PDF Generated! 📄",
        description: "Your business plan PDF has been downloaded successfully",
      })
    } catch (error) {
      console.error("Error generating PDF:", error)
      toast({
        title: "PDF Generation Failed",
        description: "Could not generate PDF. Try downloading as markdown instead.",
        variant: "destructive",
      })
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  return (
    <div className="flex flex-col space-y-4 w-full max-w-4xl mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <Image src="/logo.png" alt="5Q Logo" width={40} height={40} className="rounded-lg" />
          <h2 className="text-2xl font-bold text-primary">Your Business Plan</h2>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={handleCopy}>
            {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
            {copied ? "Copied" : "Copy Text"}
          </Button>

          <Button variant="outline" size="sm" onClick={generatePDF} disabled={isGeneratingPdf}>
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

          <Button variant="outline" size="sm" onClick={handleDownloadMarkdown}>
            <Download className="h-4 w-4 mr-2" />
            Download MD
          </Button>

          <Button variant="default" size="sm" onClick={onRestart} className="bg-primary hover:bg-primary/90">
            Start Over
          </Button>
        </div>
      </div>

      <Card className="w-full">
        <CardHeader className="bg-muted/50 pb-4">
          <CardTitle className="text-lg">AI-Generated Business Plan</CardTitle>
          <p className="text-sm text-muted-foreground">
            Download as PDF for professional presentation or markdown for editing
          </p>
        </CardHeader>
        <CardContent className="pt-6 pb-8 px-6">
          <div ref={contentRef} className="prose dark:prose-invert max-w-none">
            <ReactMarkdown
              components={{
                // Custom components for better PDF rendering
                h1: ({ children }) => (
                  <h1 className="text-3xl font-bold mb-4 pb-2 border-b-2 border-gray-300">{children}</h1>
                ),
                h2: ({ children }) => <h2 className="text-2xl font-semibold mb-3 mt-6">{children}</h2>,
                h3: ({ children }) => <h3 className="text-xl font-semibold mb-2 mt-4">{children}</h3>,
                ul: ({ children }) => <ul className="list-disc pl-6 mb-4 space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-6 mb-4 space-y-1">{children}</ol>,
                p: ({ children }) => <p className="mb-3 leading-relaxed">{children}</p>,
                strong: ({ children }) => (
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">{children}</strong>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-gray-300 pl-4 italic my-4 text-gray-600 dark:text-gray-400">
                    {children}
                  </blockquote>
                ),
              }}
            >
              {markdown}
            </ReactMarkdown>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
