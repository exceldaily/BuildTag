import { StatusPage } from "@/components/layout/status-page";

export const metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <StatusPage
      code="OFFLINE"
      title="No signal"
      description="BuildTag needs a connection to load a build. Check your data and try again."
      actions={[{ href: "/", label: "Retry" }]}
    />
  );
}
