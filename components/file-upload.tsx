"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { FileText, Upload, X, Check, Loader2, AlertCircle, Info } from "lucide-react"
import { cn } from "@/lib/utils"

interface FileUploadProps {
  onFileProcessed: (data: any) => void
  onError: (message: string) => void
}

export function FileUpload({ onFileProcessed, onError }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isProcessed, setIsProcessed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [processingStatus, setProcessingStatus] = useState<string>("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0]
      handleFile(droppedFile)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0]
      handleFile(selectedFile)
    }
  }

  const handleFile = async (selectedFile: File) => {
    // Reset previous states
    setError(null)
    setIsProcessed(false)
    setProcessingStatus("")

    // Validate file type
    const validTypes = ["application/pdf", "text/csv", "text/plain"]
    const validExtensions = [".pdf", ".csv", ".txt"]
    const fileName = selectedFile.name.toLowerCase()

    const isValidType = validTypes.includes(selectedFile.type) || validExtensions.some((ext) => fileName.endsWith(ext))

    if (!isValidType) {
      const errorMsg = "Please upload a PDF, CSV, or TXT file"
      setError(errorMsg)
      onError(errorMsg)
      return
    }

    // Validate file size (10MB limit)
    if (selectedFile.size > 10 * 1024 * 1024) {
      const errorMsg = "File too large. Maximum size is 10MB."
      setError(errorMsg)
      onError(errorMsg)
      return
    }

    setFile(selectedFile)
    setIsUploading(true)

    // Set processing status based on file type
    if (selectedFile.type === "application/pdf" || fileName.endsWith(".pdf")) {
      setProcessingStatus("Extracting text from PDF...")
    } else {
      setProcessingStatus("Processing file...")
    }

    try {
      // Create form data
      const formData = new FormData()
      formData.append("file", selectedFile)

      // Send to API
      const response = await fetch("/api/analyze/financials", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.details || data.error || `Upload failed: ${response.status}`)
      }

      onFileProcessed(data)
      setIsProcessed(true)
      setProcessingStatus("Analysis complete!")
    } catch (error) {
      console.error("Error uploading file:", error)
      const errorMsg = error instanceof Error ? error.message : "Failed to process file. Please try again."
      setError(errorMsg)
      onError(errorMsg)
      setProcessingStatus("")
    } finally {
      setIsUploading(false)
    }
  }

  const clearFile = () => {
    setFile(null)
    setIsProcessed(false)
    setError(null)
    setProcessingStatus("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div className="w-full">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".pdf,.csv,.txt"
        className="hidden"
        id="file-upload"
      />

      {!file ? (
        <div className="space-y-3">
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
              isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50",
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="flex flex-col items-center justify-center space-y-2">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">
                Drag & drop your financial document or <span className="text-primary">browse</span>
              </p>
              <p className="text-xs text-muted-foreground">Supports PDF, CSV, and TXT files (max 10MB)</p>
            </div>
          </div>

          <div className="flex items-start space-x-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
            <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-blue-700 dark:text-blue-300">
              <p className="font-medium mb-1">Supported formats:</p>
              <ul className="space-y-0.5">
                <li>
                  • <strong>PDF:</strong> Financial statements, reports (text-based PDFs work best)
                </li>
                <li>
                  • <strong>CSV:</strong> Spreadsheet data with financial metrics
                </li>
                <li>
                  • <strong>TXT:</strong> Plain text financial summaries
                </li>
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FileText className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-sm font-medium truncate max-w-[200px]">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                  {processingStatus && <p className="text-xs text-blue-600 dark:text-blue-400">{processingStatus}</p>}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {isUploading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : error ? (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                ) : isProcessed ? (
                  <Check className="h-5 w-5 text-green-500" />
                ) : (
                  <Button variant="ghost" size="icon" onClick={clearFile}>
                    <X className="h-5 w-5" />
                  </Button>
                )}
              </div>
            </div>
            {error && (
              <div className="mt-2 p-2 bg-red-50 dark:bg-red-950/20 rounded text-xs text-red-600 dark:text-red-400">
                {error}
                {error.includes("PDF") && (
                  <p className="mt-1 text-xs">
                    Tip: Try converting your PDF to TXT format for better results, or ensure your PDF contains
                    selectable text.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
