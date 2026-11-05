import { precacheUrls, swSource, versionOf } from "./sw-plugin";

describe("precacheUrls", () => {
  it("turns index.html files into page URLs and keeps other paths", () => {
    expect(precacheUrls(["index.html", "stats/index.html", "assets/zone-ab12.css", "icons/icon-192.png"], "/fordMath/")).toEqual([
      "/fordMath/",
      "/fordMath/assets/zone-ab12.css",
      "/fordMath/icons/icon-192.png",
      "/fordMath/stats/",
    ]);
  });
  it("never stores the service worker itself or .nojekyll", () => {
    expect(precacheUrls(["sw.js", ".nojekyll", "favicon.svg"], "/fordMath/")).toEqual(["/fordMath/favicon.svg"]);
  });
});

describe("versionOf", () => {
  const files = [
    { path: "index.html", content: "<h1>fordMath</h1>" },
    { path: "assets/a.js", content: "console.log(1)" },
  ];
  it("is the same for the same files, in any order", () => {
    expect(versionOf(files)).toBe(versionOf([...files].reverse()));
    expect(versionOf(files)).toMatch(/^[0-9a-f]{12}$/);
  });
  it("changes when any content changes", () => {
    expect(versionOf([files[0]!, { path: "assets/a.js", content: "console.log(2)" }])).not.toBe(versionOf(files));
  });
  it("ignores the service worker itself", () => {
    expect(versionOf([...files, { path: "sw.js", content: "anything" }])).toBe(versionOf(files));
  });
});

describe("swSource", () => {
  it("puts the constants before the template", () => {
    const code = swSource("/* template */", "/fordMath/", "abc123", ["/fordMath/"]);
    expect(code).toContain('const BASE = "/fordMath/";');
    expect(code).toContain('const VERSION = "abc123";');
    expect(code).toContain('"/fordMath/"');
    expect(code.trim().endsWith("/* template */")).toBe(true);
  });
});
