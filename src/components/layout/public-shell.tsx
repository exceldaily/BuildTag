import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

/** Marketing / public pages: header + footer around content. */
export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </>
  );
}
