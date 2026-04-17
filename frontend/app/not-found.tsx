import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <Card className="max-w-xl border-border/70 bg-card/95 shadow-glow">
        <CardHeader className="space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <SearchX className="h-6 w-6" />
          </div>
          <CardTitle className=" text-3xl">Page not found</CardTitle>
          <CardDescription>
            The page you were looking for does not exist in the current PrimeScore scaffold.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/" className="inline-flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to landing
            </Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
