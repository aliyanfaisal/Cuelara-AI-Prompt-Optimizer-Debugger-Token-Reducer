import { chromium } from "playwright";
import fs from "node:fs";
import { buildDesignDna } from "./src/lib/site-to-prompt/aggregate";
const src = fs.readFileSync("extension/collector.js", "utf8").replaceAll("export async function", "async function").replaceAll("export function", "function");
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto("https://aliyanfaisal.com/", { waitUntil: "domcontentloaded" });
await p.waitForTimeout(4000);
await p.evaluate(`(async () => { ${src}; await preparePage(); })()`);
const raw: any = await p.evaluate(`(() => { ${src}; return collectPageSamples(); })()`);
await b.close();
const dna = buildDesignDna(raw, "https://aliyanfaisal.com/");
const res = await fetch("http://localhost:3000/api/tools/site-to-prompt", {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ dna, target: "UI Builder (v0, Bolt, Lovable)", goal: "" }),
});
const data: any = await res.json();
console.log("status", res.status, Object.keys(data));
if (data.prompt) { fs.writeFileSync("/tmp/generated-prompt.md", data.prompt); console.log("LENGTH", data.prompt.length); } else console.log(JSON.stringify(data));
