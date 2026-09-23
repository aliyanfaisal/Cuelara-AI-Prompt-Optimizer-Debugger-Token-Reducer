import { MEASURE_ERROR, measureTab, openToolPage, parseWebUrl, unsupportedReason } from "./shared.js";

const $ = (id) => document.getElementById(id);

function setStatus(kind, text) {
  const el = $("status");
  if (!text) {
    el.hidden = true;
    return;
  }
  el.hidden = false;
  el.className = `status ${kind}`;
  el.replaceChildren();
  if (kind === "busy") {
    const spinner = document.createElement("span");
    spinner.className = "spin";
    el.append(spinner);
  }
  el.append(document.createTextNode(text));
}

/** Measures a tab, hands the result to the tool page, and opens it. Exported so it can be driven from tests. */
export async function runAnalysis(tab) {
  const button = $("analyse");
  button.disabled = true;
  setStatus("busy", "Measuring the page…");
  try {
    const raw = await measureTab(tab.id);
    await chrome.storage.session.set({ pending: { ok: true, raw, url: tab.url } });
    setStatus("busy", "Opening Site to Prompt…");
    await openToolPage(true);
    window.close();
  } catch {
    setStatus("error", MEASURE_ERROR);
    button.disabled = false;
  }
}

async function init() {
  $("version").textContent = `Version ${chrome.runtime.getManifest().version}`;
  $("open").addEventListener("click", async () => {
    await openToolPage(false);
    window.close();
  });

  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  const url = tab && tab.url ? parseWebUrl(tab.url) : null;
  $("host").textContent = url ? url.hostname : "Not a website";

  const reason = tab ? unsupportedReason(tab.url) : "No page is open to analyse.";
  if (reason) {
    $("analyse").disabled = true;
    setStatus("info", reason);
    return;
  }
  $("analyse").addEventListener("click", () => runAnalysis(tab));
}

init();
