import fs from "fs";
import os from "os";
import path from "path";

const htmlPath = path.join(os.tmpdir(), "jako-shop.html");
const html = fs.readFileSync(htmlPath, "utf8");

const slugToImportKey = {
  "set-17391-001-allach09-starter-set": "jako-allach09-starter-set",
  "trikot-team-ka-p219": "jako-trikot-team-kurzarm",
  "sporthose-manchester-2-0-p252": "jako-sporthose-manchester-2",
  "trainingsanzug-polyester-power-p6257": "jako-trainingsanzug-polyester-power",
  "praesentationsanzug-power-p6255": "jako-praesentationsanzug-power",
  "polyesterjacke-power-p5796": "jako-polyesterjacke-power",
  "kapuzenjacke-power-p5789": "jako-kapuzenjacke-power",
  "ziptop-power-p5792": "jako-ziptop-power",
  "trainingshose-active-p437": "jako-trainingshose-active",
  "allwetterjacke-power-p5790": "jako-allwetterjacke-power",
  "polo-power-p5786": "jako-polo-power",
  "coachjacke-team-p4407": "jako-coachjacke-team",
  "winterjacke-function-p14180": "jako-winterjacke-function",
  "longsleeve-comfort-2-0-p3387": "jako-longsleeve-comfort-2",
  "stutzen-glasgow-2-0-p166": "jako-stutzen-glasgow-2",
  "rucksack-tls-p32": "jako-rucksack-tls",
  "sporttasche-classico-p43": "jako-sporttasche-classico",
  "trinkflasche-premium-p3374": "jako-trinkflasche-premium",
  "kapuzensweat-organic-p4115": "jako-kapuzensweat-organic",
  "t-shirt-organic-p4108": "jako-t-shirt-organic",
};

function slugToKey(slug) {
  const normalized = slug.replace(/\/$/, "");
  const base = normalized.replace(/--p\d+$/, "");
  return slugToImportKey[base] ?? null;
}

function pickImage(block) {
  const firstCdn = block.match(/data-main="(https:\/\/cdn\.jako\.de\/[^"]+)"/);
  if (!firstCdn) return null;
  const url = firstCdn[1].split("?")[0];
  return url.includes("noimage") ? null : url;
}

const byKey = new Map();
const linkRe = /<a href="\/de-de\/team\/tsv_allach_09\/([^"]+)"/g;
let match;
while ((match = linkRe.exec(html)) !== null) {
  const tagEnd = html.indexOf(">", match.index);
  const tag = html.slice(match.index, tagEnd);
  if (!tag.includes("gtm-product-click")) continue;
  const slug = match[1].split("?")[0];
  const importKey = slugToKey(slug);
  if (!importKey || byKey.has(importKey)) continue;
  const closeA = html.indexOf("</a>", match.index);
  const block = html.slice(match.index, closeA > 0 ? closeA : match.index + 8000);
  const img = pickImage(block);
  if (img) byKey.set(importKey, img);
}

console.log(JSON.stringify(Object.fromEntries(byKey), null, 2));
