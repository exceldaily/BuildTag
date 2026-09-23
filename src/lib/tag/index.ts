export * from "./types";
export { STYLES, STYLE_LIST, SAFE_QR_PAIRS } from "./styles";
export { SHAPES, SHAPE_LIST } from "./shapes";
export { FRAMES, FRAME_LIST } from "./frames";
export { TEMPLATES, TEMPLATE_LIST, SIZE_PRESETS, DEFAULT_CTA, normalizeConfig } from "./templates";
export { layoutTag, physicalSize, moduleSizeMm, LAYOUT_WIDTH } from "./layout";
export { renderTagSvg, escapeXml } from "./render";
export { runDesignChecks, overallStatus } from "./checks";
export type { DesignCheck, CheckLevel } from "./checks";
