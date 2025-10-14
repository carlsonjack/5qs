"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FileUpload } from "./file-upload";
import { WebsiteInput } from "./website-input";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, Loader2, CheckCircle } from "lucide-react";

interface ContextGatheringProps {
  variant?: string | null;
  onComplete: (contextData: any) => void;
  onSkip: () => void;
  onDataUpdate?: (contextData: any) => void; // New callback for immediate sidebar updates
}

export function ContextGathering({
  variant,
  onComplete,
  onSkip,
  onDataUpdate,
}: ContextGatheringProps) {
  const [financialData, setFinancialData] = useState<any>(null);
  const [websiteData, setWebsiteData] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleFileProcessed = (data: any) => {
    setFinancialData(data);
    toast({
      title:
        variant === "fitness-coach"
          ? "Fitness data processed"
          : "Financial data processed",
      description:
        variant === "fitness-coach"
          ? "Your fitness data has been analyzed successfully."
          : "Your financial data has been analyzed successfully.",
    });

    // Update sidebar immediately
    if (onDataUpdate) {
      const contextData = {
        ...(financialData || {}),
        ...(websiteData || {}),
        ...data,
      };
      onDataUpdate(contextData);
    }
  };

  const handleWebsiteProcessed = (data: any) => {
    setWebsiteData(data);
    toast({
      title:
        variant === "fitness-coach"
          ? "Channel analyzed successfully! 🎉"
          : "Website analyzed successfully! 🎉",
      description:
        variant === "fitness-coach"
          ? "We've extracted key fitness insights from your favorite channel."
          : "We've extracted key business insights from your website.",
    });

    // Update sidebar immediately
    if (onDataUpdate) {
      const contextData = {
        ...(financialData || {}),
        ...(websiteData || {}),
        ...data,
      };
      onDataUpdate(contextData);
    }
  };

  const handleError = (message: string) => {
    toast({
      title: "Error",
      description: message,
      variant: "destructive",
    });
  };

  const handleSubmit = () => {
    setIsSubmitting(true);

    // Combine the data
    const contextData = {
      ...(financialData || {}),
      ...(websiteData || {}),
      // Preserve raw analyses for downstream plan generation
      financialAnalysis: financialData || null,
      websiteAnalysis: websiteData || null,
    };

    // If we have at least one source of data, proceed
    if (Object.keys(contextData).length > 0) {
      onComplete(contextData);
    } else {
      toast({
        title: "No data provided",
        description:
          "Please upload a file or enter a website URL, or skip this step.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  const hasAnalysisData = financialData || websiteData;

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {variant === "fitness-coach"
              ? "Add Fitness Context"
              : "Add Business Context"}
          </CardTitle>
          <CardDescription>
            {variant === "fitness-coach"
              ? "Provide additional context about your fitness journey to get more personalized insights."
              : "Provide additional context about your business to get more personalized insights."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">
                {variant === "fitness-coach"
                  ? "Share Your Favorite Workout Channel"
                  : "Analyze Your Business Website"}
              </h3>
              <WebsiteInput
                onWebsiteProcessed={handleWebsiteProcessed}
                onError={handleError}
              />
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium">
                {variant === "fitness-coach"
                  ? "Upload Fitness Documents"
                  : "Upload Relevant Documents"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {variant === "fitness-coach"
                  ? "Workout plans, nutrition guides, progress photos, or any documents that help us understand your fitness journey better."
                  : "Financial statements, business plans, marketing materials, or any documents that help us understand your business better."}
                <span className="font-medium text-green-600">
                  {" "}
                  Your files are processed locally and never stored on our
                  servers.
                </span>
              </p>
              <FileUpload
                onFileProcessed={handleFileProcessed}
                onError={handleError}
              />
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
  );
}
