import { redirect } from "next/navigation";

export default function Home() {
  // Land in the default thread — thread-centric AI-native workspace.
  redirect("/t/weekly-08sep");
}
