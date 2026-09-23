import { StatusPage } from "@/components/layout/status-page";

export default function NotFound() {
  return (
    <StatusPage
      code="404"
      title="Nothing under this hood"
      description="That page does not exist. If you scanned a decal, try the code again or explore public builds."
      actions={[
        { href: "/explore", label: "Explore builds" },
        { href: "/", label: "Home", primary: false },
      ]}
    />
  );
}
