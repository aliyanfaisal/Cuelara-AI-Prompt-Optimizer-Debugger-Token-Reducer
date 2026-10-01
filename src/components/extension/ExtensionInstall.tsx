"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Download, Puzzle, RefreshCcw } from "lucide-react";
import { EXTENSION_STORE_URL, EXTENSION_VERSION, EXTENSION_ZIP_URL } from "@/lib/extension/install";
import { pingExtension } from "@/lib/extension/extension-bridge";

/** Polls for the extension (it answers through its page bridge) so the page can react the moment it is installed. */
export function useInstalledExtensionVersion(poll = true): { version: string | null; checked: boolean } {
  const [version, setVersion] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      const v = await pingExtension();
      if (cancelled) return;
      setVersion(v);
      setChecked(true);
    };
    check();
    const interval = poll
      ? setInterval(() => {
          if (!version) check();
        }, 2500)
      : null;
    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [version, poll]);

  return { version, checked };
}

const code = "px-1.5 py-0.5 rounded bg-muted text-foreground";

/**
 * Install instructions for the Cuelara extension: the Chrome Web Store button when a listing exists,
 * otherwise a zip download with the manual "Load unpacked" steps.
 */
export function ExtensionInstall({ showUnlockNote = false }: { showUnlockNote?: boolean }) {
  const [copiedLink, setCopiedLink] = useState(false);
  const fromStore = !!EXTENSION_STORE_URL;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        {fromStore ? (
          <a
            href={EXTENSION_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-700 text-white text-xs font-semibold shadow-sm"
          >
            <Puzzle className="w-3.5 h-3.5" /> Add to Chrome
          </a>
        ) : (
          <a
            href={EXTENSION_ZIP_URL}
            download
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-700 text-white text-xs font-semibold shadow-sm"
          >
            <Download className="w-3.5 h-3.5" /> Download extension v{EXTENSION_VERSION} (.zip)
          </a>
        )}
        <span className="text-[11px] text-muted-foreground">Chrome, Edge, Brave and other Chromium browsers</span>
      </div>

      <div className="w-full rounded-xl border border-border bg-muted/20 p-4 md:p-5">
        {fromStore ? (
          <>
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground mb-3">Install in 3 steps</h3>
            <ol className="space-y-2.5 text-xs text-muted-foreground leading-relaxed list-decimal pl-4 marker:font-bold marker:text-fuchsia-500">
              <li>Click <strong className="text-foreground">Add to Chrome</strong> above to open the Chrome Web Store listing.</li>
              <li>Press <strong className="text-foreground">Add to Chrome</strong>, then <strong className="text-foreground">Add extension</strong> in the confirmation box.</li>
              <li>Open the puzzle-piece menu in the toolbar and <strong className="text-foreground">pin Cuelara</strong>, so its icon is always one click away.</li>
            </ol>
            <p className="text-[11px] text-muted-foreground mt-3">The store keeps the extension up to date automatically.</p>
          </>
        ) : (
          <>
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground mb-3">Install in 4 steps (Chrome, Edge, Brave)</h3>
            <ol className="space-y-2.5 text-xs text-muted-foreground leading-relaxed list-decimal pl-4 marker:font-bold marker:text-fuchsia-500">
              <li>Download the zip above and <strong className="text-foreground">unzip it</strong> to a folder you&apos;ll keep (don&apos;t delete it afterwards).</li>
              <li>
                <div className="flex flex-wrap items-center gap-2">
                  <span>Open <code className={code}>chrome://extensions</code> in a new tab (Edge: <code className={code}>edge://extensions</code>).</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText("chrome://extensions");
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2000);
                    }}
                    className="flex items-center gap-1 px-2 py-1 rounded-md border border-border bg-background hover:bg-muted text-[11px] font-semibold text-foreground cursor-pointer"
                  >
                    {copiedLink ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy link</>}
                  </button>
                </div>
              </li>
              <li>Turn on <strong className="text-foreground">Developer mode</strong> (top-right switch).</li>
              <li>Click <strong className="text-foreground">Load unpacked</strong> and choose the unzipped folder. Then pin the extension from the puzzle-piece menu so its icon is easy to click.</li>
            </ol>
            <p className="text-[11px] text-muted-foreground mt-3">
              Chrome may show a &ldquo;developer mode extensions&rdquo; notice when it starts — that&apos;s normal for extensions installed this way. To update later, download the new zip, replace the folder&apos;s files, and press the reload icon on the extension card.
            </p>
          </>
        )}
        {showUnlockNote && (
          <p className="text-[11px] text-muted-foreground mt-3 flex items-center gap-1.5">
            <RefreshCcw className="w-3 h-3 animate-spin shrink-0" /> This page unlocks automatically as soon as the extension is installed.
          </p>
        )}
      </div>
    </div>
  );
}
