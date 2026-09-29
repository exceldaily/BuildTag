/**
 * First-run walkthrough. Pure helpers shared by the intro carousel and the
 * guide bar that follows a new member from screen to screen. State lives in
 * the browser (no account data involved), so skipping is instant and private.
 */

export const TOUR_STORAGE_KEY = "bt-tour";

/** unset = never seen, active = following the guide, done = finished or skipped. */
export type TourState = "active" | "done";

export const TOUR_TOTAL_STEPS = 4;

export type GuideTipKey =
  | "guide_garage"
  | "guide_vehicle"
  | "guide_photos"
  | "guide_performance"
  | "guide_socials"
  | "guide_mods"
  | "guide_buildtag"
  | "guide_designer"
  | "guide_checkout";

export interface GuideStep {
  /** 1-based position in the four-step loop: vehicle, build, BuildTag, order. */
  step: number;
  tip: GuideTipKey;
  /** Reaching this screen completes the walkthrough. */
  last?: boolean;
}

/** Which tip belongs to a dashboard path; null where the guide stays quiet. */
export function guideStepForPath(pathname: string): GuideStep | null {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/dashboard") return { step: 1, tip: "guide_garage" };
  if (path === "/dashboard/vehicles/new") return { step: 1, tip: "guide_vehicle" };
  if (path === "/dashboard/orders/new") return { step: 4, tip: "guide_checkout", last: true };

  const m = /^\/dashboard\/vehicles\/[^/]+\/(.+)$/.exec(path);
  if (!m) return null;
  switch (m[1]) {
    case "setup/photos":
    case "photos":
      return { step: 2, tip: "guide_photos" };
    case "setup/performance":
    case "performance":
      return { step: 2, tip: "guide_performance" };
    case "setup/socials":
    case "socials":
      return { step: 2, tip: "guide_socials" };
    case "setup/modifications":
    case "modifications":
      return { step: 2, tip: "guide_mods" };
    case "setup/buildtag":
    case "buildtag":
      return { step: 3, tip: "guide_buildtag" };
    case "tag-designer":
      return { step: 3, tip: "guide_designer" };
    default:
      return null;
  }
}

export function readTourState(): TourState | null {
  try {
    const v = window.localStorage.getItem(TOUR_STORAGE_KEY);
    return v === "active" || v === "done" ? v : null;
  } catch {
    return null;
  }
}

/** For useSyncExternalStore: fires when the walkthrough state changes in this tab or another. */
export function subscribeTour(onChange: () => void): () => void {
  window.addEventListener("bt-tour-change", onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener("bt-tour-change", onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** Server render and first paint: behave as if the walkthrough is over, so nothing flashes. */
export const serverTourState = (): TourState | null => "done";

export function writeTourState(state: TourState): void {
  try {
    window.localStorage.setItem(TOUR_STORAGE_KEY, state);
    window.dispatchEvent(new Event("bt-tour-change"));
  } catch {
    // Private mode or blocked storage: the walkthrough simply won't persist.
  }
}
