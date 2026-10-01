"use client";

import { Check, Download } from "lucide-react";
import { EXTENSION_STORE_URL, EXTENSION_VERSION, EXTENSION_ZIP_URL } from "@/lib/extension/install";
import { ExtensionInstall, useInstalledExtensionVersion } from "./ExtensionInstall";

function isOlder(installed: string, latest: string): boolean {
  const a = installed.split(".").map(Number);
  const b = latest.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) < (b[i] || 0);
  }
  return false;
}

/** The install block of the /extension page: instructions until the extension is detected, then a ready state. */
export function ExtensionInstallSection() {
  const { version } = useInstalledExtensionVersion();

  if (!version) return <ExtensionInstall />;

  // Store installs update themselves; a manual install has to be replaced by hand.
  const outdated = !EXTENSION_STORE_URL && isOlder(version, EXTENSION_VERSION);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4">
        <span className="mt-0.5 rounded-full bg-emerald-500/15 p-1 text-emerald-600 dark:text-emerald-400">
          <Check className="w-3.5 h-3.5" />
        </span>
        <div>
          <p className="text-sm font-bold text-foreground">The Cuelara extension is installed (v{version})</p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Click the Cuelara icon in your toolbar to connect your account and see your daily usage. In ChatGPT, Claude, Gemini and other AI sites, look for the Cuelara button in the chat box.
          </p>
        </div>
      </div>
      {outdated && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <p className="text-sm font-bold text-foreground">Version {EXTENSION_VERSION} is available</p>
          <p className="text-xs text-muted-foreground mt-1 mb-3 leading-relaxed">
            Download the new zip, replace the files in your extension folder, then press the reload icon on the extension card at <code className="px-1.5 py-0.5 rounded bg-muted text-foreground">chrome://extensions</code>.
          </p>
          <a href={EXTENSION_ZIP_URL} download className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-700 text-white text-xs font-semibold shadow-sm">
            <Download className="w-3.5 h-3.5" /> Download v{EXTENSION_VERSION}
          </a>
        </div>
      )}
    </div>
  );
}
