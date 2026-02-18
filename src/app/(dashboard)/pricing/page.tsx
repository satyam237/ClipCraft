import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 py-8">
      <div>
        <h1 className="text-2xl font-semibold">Pricing / Plan</h1>
        <p className="text-(--muted-foreground) mt-1">
          Choose a plan that fits your team. More options coming soon.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Free</CardTitle>
          <CardDescription>Get started with screen recording and sharing.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-(--muted-foreground)">
            Record and share videos with a shareable link. Reactions, comments, and basic sharing options included.
          </p>
          <Button className="mt-4" asChild>
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
      <Card className="opacity-75">
        <CardHeader>
          <CardTitle>Pro (Coming soon)</CardTitle>
          <CardDescription>More storage, team features, and AI tools.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-(--muted-foreground)">
            Unlimited videos, priority processing, and advanced sharing controls.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
