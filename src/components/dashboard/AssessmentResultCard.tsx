import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AssessmentResult } from "@/types";

interface AssessmentResultCardProps {
  result: AssessmentResult;
}

export const AssessmentResultCard = ({ result }: AssessmentResultCardProps) => {
  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg text-foreground">{result.category}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Score</span>
            <span className="font-medium text-foreground">{result.score}%</span>
          </div>
          <Progress value={result.score} className="h-2" />
        </div>
        
        {result.insights.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-foreground">Key Insights</h4>
            <ul className="space-y-1">
              {result.insights.slice(0, 2).map((insight, index) => (
                <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-action mt-0.5">•</span>
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
