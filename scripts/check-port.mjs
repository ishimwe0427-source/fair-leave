import net from "net";

const preferred = Number(process.env.PORT || 3010);
const scan = Array.from({ length: 20 }, (_, i) => preferred + i);

function canListen(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.on("error", () => resolve(false));
    server.listen({ port, host: "0.0.0.0" }, () => {
      server.close(() => resolve(true));
    });
  });
}

console.log(`Port scan (start: ${preferred})`);
let firstFree = null;
for (const port of scan) {
  const free = await canListen(port);
  if (port < preferred + 10) {
    console.log(`${free ? "FREE" : "BUSY"}  ${port}`);
  }
  if (free && firstFree === null) firstFree = port;
}

if (!firstFree) {
  console.error("No free port found in range.");
  process.exit(1);
}
console.log(`\nRecommended FairLeave port: ${firstFree}`);
