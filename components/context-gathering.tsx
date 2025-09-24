"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileUpload } from "./file-upload"
import { WebsiteInput } from "./website-input"
import { BusinessProfile } from "./business-profile"
import { useToast } from "@/hooks/use-toast"
import { ArrowRight, Loader2, CheckCircle, Building2, Target, AlertCircle, Database, Laptop, TrendingUp } from "lucide-react"

interface ContextGatheringProps {
  onComplete: (contextData: any) => void
  onSkip: () => void
}

export function ContextGathering({ onComplete, onSkip }: ContextGatheringProps) {
  const [financialData, setFinancialData] = useState<any>(null)
  const [websiteData, setWebsiteData] = useState<any>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const handleFileProcessed = (data: any) => {
    setFinancialData(data)
    toast({
      title: "Financial data processed",
      description: "Your financial data has been analyzed successfully.",
    })
  }

  const handleWebsiteProcessed = (data: any) => {
    setWebsiteData(data)
    toast({
      title: "Website analyzed successfully! 🎉",
      description: "We've extracted key business insights from your website.",
    })
  }

  const handleError = (message: string) => {
    toast({
      title: "Error",
      description: message,
      variant: "destructive",
    })
  }

  // Map analysis data to business profile format
  const getBusinessProfileData = () => {
    const profileData: any = {
      businessType: "Not yet specified",
      painPoints: "Not yet specified", 
      goals: "Not yet specified",
      dataAvailable: "Not yet specified",
      priorTechUse: "Not yet specified",
      growthIntent: "Not yet specified",
    }

    // Map website analysis data
    if (websiteData) {
      if (websiteData.productsServices) {
        profileData.businessType = websiteData.productsServices
      }
      if (websiteData.marketingWeaknesses) {
        profileData.painPoints = websiteData.marketingWeaknesses
      }
      if (websiteData.marketingStrengths) {
        profileData.goals = websiteData.marketingStrengths
      }
      if (websiteData.techStack) {
        profileData.priorTechUse = websiteData.techStack
      }
      if (websiteData.customerSegment) {
        profileData.growthIntent = `Targeting: ${websiteData.customerSegment}`
      }
    }

    // Map financial analysis data
    if (financialData) {
      if (financialData.businessType && profileData.businessType === "Not yet specified") {
        profileData.businessType = financialData.businessType
      }
      if (financialData.cashFlowRisks && profileData.painPoints === "Not yet specified") {
        profileData.painPoints = financialData.cashFlowRisks
      }
      if (financialData.revenueTrend) {
        profileData.dataAvailable = financialData.revenueTrend
      }
      if (financialData.largestCostCenters) {
        profileData.goals = `Optimize: ${financialData.largestCostCenters}`
      }
    }

    return profileData
  }

  const handleSubmit = () => {
    setIsSubmitting(true)

    // Combine the data
    const contextData = {
      ...(financialData || {}),
      ...(websiteData || {}),
    }

    // If we have at least one source of data, proceed
    if (Object.keys(contextData).length > 0) {
      onComplete(contextData)
    } else {
      toast({
        title: "No data provided",
        description: "Please upload a file or enter a website URL, or skip this step.",
        variant: "destructive",
      })
      setIsSubmitting(false)
    }
  }

  const businessProfileData = getBusinessProfileData()
  const hasAnalysisData = financialData || websiteData

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add Business Context (Optional)</CardTitle>
          <CardDescription>
            Provide additional context about your business to get more personalized insights.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Upload Financial Statement</h3>
                <FileUpload onFileProcessed={handleFileProcessed} onError={handleError} />
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium">Analyze Your Business Website</h3>
                <WebsiteInput onWebsiteProcessed={handleWebsiteProcessed} onError={handleError} />
              </div>
            </div>

            {/* Business Profile Preview */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium">Business Profile Preview</h3>
                {hasAnalysisData && (
                  <Badge variant="secondary" className="text-xs">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Analysis Complete
                  </Badge>
                )}
              </div>
              
              {hasAnalysisData ? (
                <div className="border rounded-lg p-4 bg-muted/30">
                  <BusinessProfile contextSummary={businessProfileData} />
                </div>
              ) : (
                <div className="border rounded-lg p-8 text-center text-muted-foreground">
                  <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Upload data or analyze your website to see insights here</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={onSkip}>
              Skip
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || (!financialData && !websiteData)}
              className="bg-primary hover:bg-primary/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
