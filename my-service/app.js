const http = require('http');
const os = require('os');
http.createServer((req, res) => {
  res.end(`Hello from ${os.hostname()}\n`);
}).listen(3000);