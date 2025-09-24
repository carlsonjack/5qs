"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Globe, ArrowRight, Loader2, X, AlertCircle, Info } from "lucide-react"

interface WebsiteInputProps {
  onWebsiteProcessed: (data: any) => void
  onError: (message: string) => void
}

export function WebsiteInput({ onWebsiteProcessed, onError }: WebsiteInputProps) {
  const [url, setUrl] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isProcessed, setIsProcessed] = useState(false)
  const [processedUrl, setProcessedUrl] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [analysisStatus, setAnalysisStatus] = useState("")

  const isValidUrl = (urlString: string) => {
    try {
      const url = new URL(urlString)
      return url.protocol === "http:" || url.protocol === "https:"
    } catch {
      return false
    }
  }

  const normalizeUrl = (urlString: string) => {
    // Add https:// if no protocol is specified
    if (!urlString.startsWith("http://") && !urlString.startsWith("https://")) {
      return "https://" + urlString
    }
    return urlString
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!url.trim()) {
      const errorMsg = "Please enter a website URL"
      setError(errorMsg)
      onError(errorMsg)
      return
    }

    const normalizedUrl = normalizeUrl(url.trim())

    if (!isValidUrl(normalizedUrl)) {
      const errorMsg = "Please enter a valid website URL (e.g., example.com or https://example.com)"
      setError(errorMsg)
      onError(errorMsg)
      return
    }

    setError(null)
    setIsAnalyzing(true)
    setAnalysisStatus("Fetching website content...")

    try {
      const response = await fetch("/api/analyze/website", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: normalizedUrl }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.details || data.error || `Website analysis failed: ${response.status}`)
      }

      setAnalysisStatus("Analysis complete!")
      onWebsiteProcessed(data)
      setIsProcessed(true)
      setProcessedUrl(normalizedUrl)
    } catch (error) {
      console.error("Error analyzing website:", error)
      const errorMsg = error instanceof Error ? error.message : "Failed to analyze website. Please try again."
      setError(errorMsg)
      onError(errorMsg)
      setAnalysisStatus("")
    } finally {
      setIsAnalyzing(false)
    }
  }

  const resetForm = () => {
    setUrl("")
    setIsProcessed(false)
    setProcessedUrl("")
    setError(null)
    setAnalysisStatus("")
  }

  return (
    <div className="w-full space-y-3">
      {!isProcessed ? (
        <>
          <form onSubmit={handleSubmit} className="space-y-2">
            <div className="flex items-center space-x-2">
              <Globe className="h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Enter your business website URL (e.g., example.com)"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value)
                  setError(null) // Clear error when user types
                }}
                disabled={isAnalyzing}
                className="flex-1"
              />
              <Button type="submit" size="sm" disabled={!url.trim() || isAnalyzing}>
                {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              </Button>
            </div>
            {analysisStatus && (
              <p className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                {analysisStatus}
              </p>
            )}
          </form>

          {error && (
            <div className="flex items-start space-x-2 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-red-700 dark:text-red-300">
                <p>{error}</p>
                {error.includes("protected") && (
                  <p className="mt-1">
                    Some websites block automated access. Try entering key information manually instead.
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex items-start space-x-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
            <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-blue-700 dark:text-blue-300">
              <p className="font-medium mb-1">Website Analysis Tips:</p>
              <ul className="space-y-0.5">
                <li>• Enter your main business website URL</li>
                <li>• Works best with public websites (not password-protected)</li>
                <li>• We'll analyze your products, services, and target audience</li>
              </ul>
            </div>
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Globe className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium truncate max-w-[200px]">{processedUrl}</p>
                  <p className="text-xs text-green-500">Website analyzed successfully</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={resetForm}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
