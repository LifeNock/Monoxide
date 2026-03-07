import { BareMuxConnection } from "/baremux/index.mjs";

try {
  const conn = new BareMuxConnection("/baremux/worker.js");
  const wispUrl =
    (location.protocol === "https:" ? "wss" : "ws") +
    "://" +
    location.host +
    "/wisp/";
  await conn.setTransport("/epoxy/index.mjs", [{ wisp: wispUrl }]);
  window.dispatchEvent(new Event("__proxy_ready"));
} catch (e) {
  window.__proxy_error = e?.message || String(e);
  window.dispatchEvent(new Event("__proxy_error"));
}
