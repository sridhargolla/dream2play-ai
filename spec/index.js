// spec/index.js
// Universal entry point for Spec-Kit checks.

const info = {
  version: "1.0.0",
  name: "dream2play-ai-specs",
  description: "Dream2Play AI game generator specifications",
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = info;
} else {
  globalThis.specInfo = info;
}
