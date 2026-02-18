"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

/**
 * Upload is now handled on the preview page (background upload + shareable link).
 * Redirect to preview when session is present, otherwise to dashboard.
 */
export default function UploadPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("session");

  useEffect(() => {
    if (sessionId) {
      router.replace(`/dashboard/preview?session=${sessionId}`);
    } else {
      router.replace("/dashboard");
    }
  }, [sessionId, router]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center p-4">
      <p className="text-sm text-(--muted-foreground)">Redirecting…</p>
    </div>
  );
}
