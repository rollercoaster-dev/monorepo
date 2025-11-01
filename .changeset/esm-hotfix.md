---
"@rollercoaster-dev/rd-logger": patch
---

Fix ESM import compatibility for Node.js environments. Updated TypeScript configuration to use moduleResolution: "NodeNext" and added .js extensions to all relative imports. This fixes the ERR_MODULE_NOT_FOUND error when importing the package in Node.js ESM projects.
