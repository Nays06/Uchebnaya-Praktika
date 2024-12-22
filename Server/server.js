const http = require("http");
const https = require('https');
const fs = require("fs");
const url = require("url");

const data = require("./data.json");

const port = 3000;

const loadContent = (urlContent, res) => {
    const protocol = url.parse(urlContent).protocol === 'https:' ? https : http;

    protocol.get(urlContent, (contentRes) => {
        if (contentRes.statusCode !== 200) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: `Failed to fetch content. Status code: ${contentRes.statusCode}` }));
            return;
        }

        const contentLength = parseInt(contentRes.headers['content-length'], 10);
        let downloadedLength = 0;
        let body = '';

        contentRes.on('data', (chunk) => {
            body += chunk;
            downloadedLength += chunk.length;
            const progress = contentLength ? Math.round((downloadedLength / contentLength) * 100) : 0;

            res.write(JSON.stringify({
                status: 'progress',
                size: contentLength,
                downloaded: downloadedLength,
                progress,
            }) + "\n");
        });

        contentRes.on('end', () => {
            res.write(JSON.stringify({
                status: 'completed',
                content: body,
            }) + "\n");
            res.end();
        });
    }).on('error', (error) => {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `Failed to fetch content. Error: ${error.message}` }));
    });
};

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  const query = parsedUrl.query;

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (path === "/keywords") {
    if (req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(Object.keys(data)));
    } else {
      res.writeHead(405, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Method Not Allowed" }));
    }
  } else if (path === "/urls") {
    if (req.method === "GET" && query.keyword) {
      const keyword = query.keyword;
      if (data[keyword]) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(data[keyword]));
      } else {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Keyword not found" }));
      }
    } else {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid request" }));
    }
  } else if (path === "/download") {
    if (req.method === "GET" && query.url) {
      const urlContent = query.url;
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Transfer-Encoding", "chunked");
      loadContent(urlContent, res);
    } else {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid request" }));
    }
  } else {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not Found" }));
  }
});

server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
