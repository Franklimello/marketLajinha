const http = require('http');

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok', port: PORT, url: req.url }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Teste minimo rodando na porta ${PORT}`);
});
