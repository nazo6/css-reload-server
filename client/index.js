const wsUrl = "{{wsUrl}}";

console.log("[css-reload-server] Connecting to " + wsUrl);

const styleTag = document.createElement("style");
document.head.appendChild(styleTag);

const conn = new WebSocket(wsUrl);
conn.onmessage = function (e) {
  const data = JSON.parse(e.data);
  if (data.type === "css") {
    console.log("[css-reload-server] Reloading css");
    styleTag.innerHTML = data.content;
  }
};
