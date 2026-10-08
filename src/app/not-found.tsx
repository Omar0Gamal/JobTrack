import Link from "next/link";
import { FileQuestion, Kanban, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-muted/20">
      <Card className="w-full max-w-md border-border shadow-lg text-center">
        <CardHeader className="pb-2">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <FileQuestion className="h-7 w-7" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            404 Error
          </span>
          <CardTitle className="text-2xl font-bold tracking-tight mt-1">
            Page Not Found
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2 text-sm text-muted-foreground">
          <p>
            The page you are looking for doesn&apos;t exist or has been moved to another
            location.
          </p>
        </CardContent>
        <CardFooter className="flex gap-2 justify-center pt-2">
          <Button variant="default" size="sm" asChild className="gap-2">
            <Link href="/board">
              <Kanban className="h-4 w-4" />
              Go to Board
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild className="gap-2">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              Home Page
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
