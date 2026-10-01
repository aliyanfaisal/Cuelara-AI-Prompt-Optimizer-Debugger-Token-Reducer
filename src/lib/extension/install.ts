import { EXTENSION_VERSION, EXTENSION_ZIP_URL } from "@/lib/site-to-prompt/extension-version";

/**
 * Chrome Web Store listing of the Cuelara extension. While it is empty the extension is offered as a manual
 * download (unzip + "Load unpacked"); once it is set, every install prompt switches to the store button.
 */
export const EXTENSION_STORE_URL = process.env.NEXT_PUBLIC_EXTENSION_URL || "";

export { EXTENSION_VERSION, EXTENSION_ZIP_URL };
