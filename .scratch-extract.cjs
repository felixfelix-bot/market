const fs = require("fs");
const map = JSON.parse(fs.readFileSync("node_modules/@cashu/cashu-ts/lib/cashu-ts.cjs.map", "utf8"));
const idx = map.sources.indexOf("../src/utils.ts");
const u = map.sourcesContent[idx];
const lines = u.split("\n");
// Print the keyset id version handling area (around line 660-690)
console.log("===== utils.ts lines 655-700 (keyset id handling) =====");
for (let i = 654; i < 700 && i < lines.length; i++) {
    console.log((i+1) + ": " + lines[i]);
}
// Find the base64 helper functions
console.log("\n===== base64-related functions in utils.ts =====");
lines.forEach((l, i) => {
    if (/encodeBase64ToJson|encodeJsonToBase64|encodeBase64toUint8|encodeUint8toBase64/.test(l)) {
        for (let j = i; j < Math.min(i + 12, lines.length); j++) console.log((j+1) + ": " + lines[j]);
        console.log("...");
    }
});
