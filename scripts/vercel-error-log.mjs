// Fetch the deployed page body so we can see the error text.
// Run: node scripts/vercel-error-log.mjs <url>
const url = process.argv[2] || "https://doctorate-topics-platform.vercel.app/";
console.log("Fetching", url);
fetch(url)
  .then((res) => {
    console.log("Status:", res.status, res.statusText);
    return res.text();
  })
  .then((text) => {
    const limited = text.slice(0, 3000);
    console.log("--- BODY START ---");
    console.log(limited);
    console.log("--- BODY END ---");
  })
  .catch((err) => console.error("Fetch failed:", err.message));
