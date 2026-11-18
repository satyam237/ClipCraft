"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ShieldX } from "lucide-react";

export function AccessDenied({ reason }: { reason: string }) {
  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
          <ShieldX className="h-6 w-6 text-red-500" />
        </div>
        <CardTitle>Access denied</CardTitle>
        <CardDescription>{reason}</CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center gap-2">
        <Button variant="outline" asChild>
          <Link href="/login">Sign in</Link>
        </Button>
        <Button variant="ghost" asChild>
          <Link href="/">Go home</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
