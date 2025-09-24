"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Lock, Download, Send } from "lucide-react";
import { toast } from "sonner";

interface EmailGateProps {
  onEmailSubmit: (email: string) => Promise<void>;
  isLoading?: boolean;
}

export function EmailGate({ onEmailSubmit, isLoading = false }: EmailGateProps) {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsSubmitting(true);
    try {
      await onEmailSubmit(email);
      toast.success("Business plan sent to your email!");
    } catch (error) {
      toast.error("Failed to send business plan. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Lock className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-xl">Get Your Complete Business Plan</CardTitle>
        <CardDescription>
          Enter your email to unlock the full AI implementation roadmap, 
          download as PDF, and receive it directly in your inbox.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>
          
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isSubmitting || isLoading}
          >
            {isSubmitting ? (
              "Sending..."
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send Me The Full Plan
              </>
            )}
          </Button>
          
          <div className="text-xs text-muted-foreground text-center">
            We'll also send you a PDF version and forward your details to our AI implementation partners.
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
