const params = new URLSearchParams(location.search);
const id = params.get("id");
let origin = null;
try {
  const url = new URL(params.get("url") || "");
  if (url.protocol === "http:" || url.protocol === "https:") origin = url;
} catch {
  // Falls through to the disabled state below.
}

const allow = document.getElementById("allow");
const deny = document.getElementById("deny");
document.getElementById("site").textContent = origin ? origin.hostname : "this site";

function decide(granted) {
  chrome.runtime.sendMessage({ type: "siteAccessDecision", id, granted }).finally(() => window.close());
}

if (!origin || !id) {
  allow.disabled = true;
}

// permissions.request must run directly inside the click, so it can't be deferred to the background.
allow.addEventListener("click", async () => {
  allow.disabled = true;
  let granted = false;
  try {
    granted = await chrome.permissions.request({ origins: [`${origin.protocol}//${origin.hostname}/*`] });
  } catch {
    granted = false;
  }
  decide(granted);
});
deny.addEventListener("click", () => decide(false));
