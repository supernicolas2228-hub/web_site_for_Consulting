"use strict";

/**
 * До загрузки next-swc ставит процесс похожим на WebContainers: Next сначала грузит WASM
 * и не дергает нативный @next/swc (Tokio + pthread на Beget может дать EPERM).
 * См. next/dist/build/swc/index.js: shouldLoadWasmFallbackFirst … || isWebContainer.
 */
const v = process.versions;
if (!Object.prototype.hasOwnProperty.call(v, "webcontainer")) {
  Object.defineProperty(v, "webcontainer", {
    configurable: false,
    enumerable: true,
    value: "1",
    writable: false,
  });
}
