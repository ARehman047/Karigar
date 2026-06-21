import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Briefcase, ArrowRight } from "lucide-react";
import { Mentor } from "@/types";

interface DualMentorDisplayProps {
  academicMentor: Mentor;
  industryMentor: Mentor;
}

export const DualMentorDisplay = ({ academicMentor, industryMentor }: DualMentorDisplayProps) => {
  const getMentorInitials = (name: string) => name.split(" ").map(n => n[0]).join("");

  return (
    <Card className="border-2 border-primary/20 bg-accent/30">
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4 text-center">
          Your Dual Expert Match
        </h3>
        
        <div className="flex flex-col md:flex-row items-center justify-center gap-6">
          {/* Academic Mentor */}
          <div className="flex-1 flex flex-col items-center text-center space-y-3">
            <Badge variant="secondary" className="gap-1 mb-2">
              <BookOpen className="h-3 w-3" />
              Academic Expert
            </Badge>
            <Avatar className="h-20 w-20 border-4 border-primary">
              <AvatarImage src={academicMentor.avatar} alt={academicMentor.name} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                {getMentorInitials(academicMentor.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h4 className="font-semibold text-foreground">{academicMentor.name}</h4>
              <p className="text-sm text-muted-foreground">{academicMentor.title}</p>
            </div>
            <div className="flex flex-wrap gap-1 justify-center">
              {academicMentor.expertise.slice(0, 2).map((skill, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>

          {/* Connector */}
          <div className="hidden md:flex items-center justify-center">
            <div className="p-3 bg-action/10 rounded-full">
              <ArrowRight className="h-6 w-6 text-action" />
            </div>
          </div>

          {/* Industry Mentor */}
          <div className="flex-1 flex flex-col items-center text-center space-y-3">
            <Badge variant="secondary" className="gap-1 mb-2">
              <Briefcase className="h-3 w-3" />
              Industry Expert
            </Badge>
            <Avatar className="h-20 w-20 border-4 border-action">
              <AvatarImage src={industryMentor.avatar} alt={industryMentor.name} />
              <AvatarFallback className="bg-action text-action-foreground text-xl">
                {getMentorInitials(industryMentor.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h4 className="font-semibold text-foreground">{industryMentor.name}</h4>
              <p className="text-sm text-muted-foreground">{industryMentor.title}</p>
            </div>
            <div className="flex flex-wrap gap-1 justify-center">
              {industryMentor.expertise.slice(0, 2).map((skill, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <p className="text-sm text-muted-foreground text-center mt-6">
          Combined expertise to guide you from theory to practice
        </p>
      </CardContent>
    </Card>
  );
};
