const http = require("node:http");

const server = http.createServer((request, response) => {
  request.resume();
  const isWorkflowList =
    request.method === "GET" && request.url === "/bridge/v2/workflows";
  const isWorkflowDescribe =
    request.method === "POST" &&
    request.url === "/bridge/v2/workflows/describe";
  if (isWorkflowList || isWorkflowDescribe) {
    const body = JSON.stringify({
      status: "ok",
      result: isWorkflowList
        ? {
            workflows: [
              { id: "literature-analysis", label: "Literature Analysis" },
            ],
          }
        : {
            workflowId: "literature-analysis",
            selection: {
              acceptsNoSelection: false,
              inputs: {
                member: { kind: "attachment" },
                grouping: { mode: "each" },
              },
              validateSelection: {
                select: { policy: "input-member", source: "selected" },
                filters: [],
              },
            },
            provider: { required: false },
            options: { required: [] },
          },
    });
    response.writeHead(200, {
      "content-type": "application/json",
      "content-length": Buffer.byteLength(body),
    });
    response.end(body);
    return;
  }
  response.writeHead(404);
  response.end();
});

server.listen(0, "127.0.0.1", () => {
  process.stdout.write(`http://127.0.0.1:${server.address().port}/bridge/v2\n`);
});
