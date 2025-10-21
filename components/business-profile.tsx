import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Target,
  AlertCircle,
  Database,
  Laptop,
  TrendingUp,
} from "lucide-react";
import { BadgeCollection } from "./badge-display";
import { BadgeType } from "@/lib/gamification/badges";

interface ContextSummary {
  businessType: string;
  painPoints: string;
  goals: string;
  dataAvailable: string;
  priorTechUse: string;
  growthIntent: string;
  companyName?: string;
}

interface BusinessProfileProps {
  contextSummary: ContextSummary | null;
  earnedBadges?: BadgeType[];
}

export function BusinessProfile({
  contextSummary,
  earnedBadges = [],
}: BusinessProfileProps) {
  const fields = [
    {
      key: "businessType",
      label: "Business Type",
      icon: Building2,
      value: contextSummary?.businessType || "Not yet specified",
    },
    {
      key: "priorTechUse",
      label: "Tech Stack",
      icon: Laptop,
      value: contextSummary?.priorTechUse || "Not yet specified",
    },
    {
      key: "growthIntent",
      label: "Growth Intent",
      icon: TrendingUp,
      value: contextSummary?.growthIntent || "Not yet specified",
    },
    {
      key: "painPoints",
      label: "Pain Points",
      icon: AlertCircle,
      value: contextSummary?.painPoints || "Not yet specified",
    },
    {
      key: "goals",
      label: "Goals",
      icon: Target,
      value: contextSummary?.goals || "Not yet specified",
    },
    {
      key: "dataAvailable",
      label: "Data Available",
      icon: Database,
      value: contextSummary?.dataAvailable || "Not yet specified",
    },
  ];

  return (
    <Card variant="glass" className="h-full flex flex-col overflow-visible">
      <CardHeader className="pb-3 flex-shrink-0">
        <CardTitle className="text-lg flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" />
          Business Profile
        </CardTitle>
      </CardHeader>
      <CardContent
        className="space-y-4 flex-1 max-h-[calc(100vh-200px)] edge-fade"
        style={{
          scrollbarWidth: "thin",
          overflowY: "auto",
          overflowX: "visible",
        }}
      >
        {fields.map((field) => {
          const Icon = field.icon;
          const isSpecified = field.value !== "Not yet specified";

          return (
            <div key={field.key} className="space-y-2">
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">{field.label}</span>
                {isSpecified && (
                  <Badge variant="secondary" className="text-xs">
                    Updated
                  </Badge>
                )}
              </div>
              <p
                className={`text-sm pl-6 ${
                  isSpecified
                    ? "text-foreground"
                    : "text-muted-foreground italic"
                }`}
              >
                {/* Truncate and clean long values */}
                {field.value.length > 200
                  ? `${field.value.substring(0, 200)}...`
                  : field.value}
              </p>
            </div>
          );
        })}

        {/* Badges section below profile fields */}
        {earnedBadges.length > 0 && (
          <div className="pt-4 border-t mt-4">
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-muted-foreground">
                Achievements
              </p>
              <BadgeCollection badges={earnedBadges} size="sm" />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
