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

interface ContextSummary {
  businessType: string;
  painPoints: string;
  goals: string;
  dataAvailable: string;
  priorTechUse: string;
  growthIntent: string;
}

interface BusinessProfileProps {
  contextSummary: ContextSummary | null;
}

export function BusinessProfile({ contextSummary }: BusinessProfileProps) {
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
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" />
          Business Profile
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
      </CardContent>
    </Card>
  );
}
