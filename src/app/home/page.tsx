import { redirect } from "next/navigation";

export default function HomeAlias() {
  // Match the live-app /home path onto the existing thread workspace.
  redirect("/t/weekly-08sep");
}
