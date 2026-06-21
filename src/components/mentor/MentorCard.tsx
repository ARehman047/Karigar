import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, BookOpen, Briefcase, MapPin } from "lucide-react";
import { Mentor } from "@/types";
import { BadgeChip } from "@/components/mentor/BadgeChip";
import { Link } from "react-router-dom";

interface MentorCardProps {
  mentor: Mentor;
  onBook?: () => void;
}

export const MentorCard = ({ mentor, onBook }: MentorCardProps) => {
  const TypeIcon = mentor.type === "academic" ? BookOpen : Briefcase;
  const initials = mentor.name
    .split(" ")
    .map((n) => n[0])
    .join("");

  return (
    <Card className="hover:shadow-lg transition-all duration-200 border-border">
      <CardHeader className="pb-4 p-4 sm:p-6">
        <div className="flex items-start gap-3 sm:gap-4">
          <Avatar className="h-12 w-12 sm:h-16 sm:w-16 shrink-0 border-2 border-primary">
            <AvatarImage src={mentor.avatar} alt={mentor.name} />
            <AvatarFallback className="bg-primary text-primary-foreground text-base sm:text-lg">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base sm:text-lg text-foreground truncate">{mentor.name}</h3>
            <p className="text-sm text-muted-foreground line-clamp-2 sm:truncate">{mentor.title}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge variant="secondary" className="gap-1">
                <TypeIcon className="h-3 w-3" />
                {mentor.type === "academic" ? "Academic" : "Industry"}
              </Badge>
              <BadgeChip badge={mentor.badge} />
              <div className="flex items-center gap-1 text-sm">
                <Star className="h-4 w-4 fill-warning text-warning" />
                <span className="font-medium">{mentor.rating.toFixed(1)}</span>
                <span className="text-muted-foreground">({mentor.sessionsCount})</span>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-4 px-4 sm:px-6 space-y-3">
        {mentor.bio && (
          <p className="text-sm text-muted-foreground line-clamp-2">{mentor.bio}</p>
        )}

        <div className="flex items-center justify-between gap-2 text-sm">
          <div className="flex items-center gap-1 min-w-0 text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{mentor.city}</span>
          </div>
          <Badge variant="outline" className="text-xs shrink-0 max-w-[55%] truncate">
            {mentor.field}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-2">
          {mentor.expertise.slice(0, 3).map((skill, index) => (
            <Badge key={index} variant="outline" className="text-xs">
              {skill}
            </Badge>
          ))}
          {mentor.expertise.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{mentor.expertise.length - 3} more
            </Badge>
          )}
        </div>

        {mentor.specialities && mentor.specialities.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Specialities</p>
            <div className="flex flex-wrap gap-1.5">
              {mentor.specialities.map((s, i) => (
                <Badge key={i} variant="secondary" className="text-xs bg-action/10 text-action border-action/20">
                  {s}
                </Badge>
              ))}
            </div>
          </div>
        )}

      </CardContent>

      <CardFooter className="flex-col sm:flex-row gap-2 px-4 sm:px-6">
        <Button variant="outline" className="w-full sm:flex-1" asChild>
          <Link to={`/mentor/${mentor.id}`}>View Profile</Link>
        </Button>
        <Button variant="action" className="w-full sm:flex-1" asChild>
          <Link to={`/book/${mentor.id}`}>Book Session</Link>
        </Button>
      </CardFooter>
    </Card>
  );
};
