"use client";

import Link from "next/link";
import { Download, Puzzle } from "lucide-react";
import { EXTENSION_STORE_URL, EXTENSION_VERSION, EXTENSION_ZIP_URL } from "@/lib/extension/install";
import { useInstalledExtensionVersion } from "./ExtensionInstall";

/** Compact "get the extension" card for the tools sidebar. Hidden once the extension is installed. */
export function ExtensionPromo() {
  const { version, checked } = useInstalledExtensionVersion(false);
  if (!checked || version) return null;

  return (
    <div className="mt-4 rounded-xl border border-fuchsia-500/20 bg-fuchsia-500/5 p-3.5">
      <div className="flex items-center gap-2 mb-1">
        <Puzzle className="w-4 h-4 text-fuchsia-500 shrink-0" />
        <p className="text-xs font-bold text-foreground">Cuelara extension</p>
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed mb-3">
        Use these tools inside ChatGPT, Claude, Gemini and other AI chat boxes.
      </p>
      {EXTENSION_STORE_URL ? (
        <a
          href={EXTENSION_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-fuchsia-600 py-1.5 text-xs font-bold text-white hover:bg-fuchsia-700 transition-colors"
        >
          <Puzzle className="w-3.5 h-3.5" /> Add to Chrome
        </a>
      ) : (
        <a
          href={EXTENSION_ZIP_URL}
          download
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-fuchsia-600 py-1.5 text-xs font-bold text-white hover:bg-fuchsia-700 transition-colors"
        >
          <Download className="w-3.5 h-3.5" /> Download v{EXTENSION_VERSION}
        </a>
      )}
      <Link href="/extension" className="mt-2 block text-center text-[11px] font-semibold text-fuchsia-600 dark:text-fuchsia-400 hover:underline">
        {EXTENSION_STORE_URL ? "Learn more" : "Install guide"}
      </Link>
    </div>
  );
}
