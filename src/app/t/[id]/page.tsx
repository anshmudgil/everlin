"use client";

import { useParams } from "next/navigation";
import { EverlinWorkspace } from "@/components/everlin-workspace";

export default function ThreadPage() {
  const params = useParams<{ id: string }>();
  return <EverlinWorkspace threadId={params.id} />;
}
