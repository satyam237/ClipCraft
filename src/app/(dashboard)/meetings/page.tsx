import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";

export default function MeetingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Meetings</h1>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Meeting recordings
          </CardTitle>
          <CardDescription>
            Your meeting recordings will appear here. Connect a calendar or start a meeting
            recording from your dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[var(--muted-foreground)]">
            No meetings yet. Record a video or configure meeting settings in Personal settings.
          </p>
          <div className="mt-4 flex gap-2">
            <Button asChild>
              <Link href="/dashboard/record">Record a video</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/settings?tab=meeting-recordings">Meeting settings</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
