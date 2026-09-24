import { permanentRedirect } from "next/navigation";

/** The copyright policy moved to /copyright. Old /dmca links keep working. */
export default function DmcaPage() {
  permanentRedirect("/copyright");
}
