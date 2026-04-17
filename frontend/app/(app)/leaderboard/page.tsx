import { cn } from "@/lib/utils";
import { Crown, Medal, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { mockLeaderboard } from "@/lib/mock-data";

export default function LeaderboardPage() {
  return (
    <div className="space-y-6">
      
      <Card className="overflow-hidden bg-background border border-border/50 relative rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary/40 via-primary to-primary/40" />
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
        <CardHeader className="space-y-2 relative z-10 p-6 lg:px-10 lg:pt-10 lg:pb-6 border-b border-border/40 bg-muted/10">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              <CardTitle className="text-3xl md:text-4xl font-black tracking-tight text-foreground">Global Leaderboard</CardTitle>
              <CardDescription className="text-muted-foreground text-base font-medium mt-1">
                See where you stand against other candidates globally.
              </CardDescription>
            </div>
            <div className="hidden md:flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 lg:px-10 lg:py-6 relative z-10 bg-background/50 flex flex-wrap items-center gap-4">
            
          <div className="flex flex-wrap gap-2.5">
            {["All-time", "This month", "This week"].map((item, index) => (
              <Button 
                key={item} 
                variant={index === 0 ? "solid" : "outline"} 
                size="sm"
                className={cn(
                  "rounded-xl font-bold text-sm tracking-wide transition-all h-10 px-5",
                  index === 0 ? "shadow-md bg-foreground text-background hover:bg-foreground/90" : "border-border/60 bg-transparent hover:bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                {item}
              </Button>
            ))}
          </div>

        </CardContent>
      </Card>


      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle>Ranking table</CardTitle>
            <CardDescription>Separate Reading and Listening surfaces will plug into the same shell.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {mockLeaderboard.map((entry) => (
              <div
                key={`${entry.rank}-${entry.name}`}
                className={`flex items-center justify-between gap-4 rounded-lg border px-4 py-4 ${entry.isCurrentUser ? "border-primary bg-primary/10" : "border-border/60"}`}
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent/60 font-semibold">
                    {entry.rank === 1 ? <Crown className="h-5 w-5 text-amber-500" /> : entry.rank <= 3 ? <Trophy className="h-5 w-5 text-muted-foreground" /> : <Medal className="h-5 w-5 text-muted-foreground" />}
                  </div>
                  <div>
                    <p className="font-medium">{entry.isCurrentUser ? `You (${entry.name})` : entry.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {entry.type} leaderboard • {entry.attempts} attempts
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold">{entry.band}</p>
                  <Badge tone={entry.qualified ? "success" : "warning"}>{entry.qualified ? "Qualified" : "Unqualified"}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Filter panel</CardTitle>
            <CardDescription>Reading, Listening, Combined Avg placeholders ready for API wiring.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              <Button variant="outline" className="justify-start">
                Reading
              </Button>
              <Button variant="outline" className="justify-start">
                Listening
              </Button>
              <Button variant="outline" className="justify-start">
                Combined Avg
              </Button>
            </div>
            <div className="rounded-lg border border-dashed border-border/80 p-5 text-sm text-muted-foreground">
              Privacy toggle and public leaderboard visibility are handled in profile settings later.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
