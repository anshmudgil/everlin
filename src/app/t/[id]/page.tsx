"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { EverlinWorkspace } from "@/components/everlin-workspace";

function ThreadWorkspace() {
  const params = useParams<{ id: string }>();
  return <EverlinWorkspace threadId={params.id} />;
}

export default function ThreadPage() {
  // useSearchParams (inside the workspace) requires a Suspense boundary.
  return (
    <Suspense fallback={<div className="h-dvh bg-background" />}>
      <ThreadWorkspace />
    </Suspense>
  );
}
