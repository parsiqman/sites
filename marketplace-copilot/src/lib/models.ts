/**
 * Kept in its own module so the options page and storage layer can read the
 * default without pulling the Anthropic SDK into their bundles.
 */
export const DEFAULT_MODEL = "claude-opus-5";
