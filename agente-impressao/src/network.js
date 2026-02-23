const net = require('net');
const os = require('os');

function getLocalSubnets() {
  const interfaces = os.networkInterfaces();
  const subnets = [];
  for (const iface of Object.values(interfaces)) {
    for (const info of iface) {
      if (info.family === 'IPv4' && !info.internal) {
        const parts = info.address.split('.');
        subnets.push(`${parts[0]}.${parts[1]}.${parts[2]}`);
      }
    }
  }
  return [...new Set(subnets)];
}

function testPort(ip, port, timeoutMs = 800) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let done = false;

    const finish = (result) => {
      if (done) return;
      done = true;
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(timeoutMs);
    socket.on('connect', () => finish(true));
    socket.on('timeout', () => finish(false));
    socket.on('error', () => finish(false));
    socket.connect(port, ip);
  });
}

async function scanNetwork(onProgress, onFound) {
  const subnets = getLocalSubnets();
  if (subnets.length === 0) return [];

  const found = [];
  const port = 9100;
  const total = subnets.length * 254;
  let checked = 0;

  for (const subnet of subnets) {
    const batchSize = 30;
    for (let start = 1; start <= 254; start += batchSize) {
      const promises = [];
      for (let i = start; i < Math.min(start + batchSize, 255); i++) {
        const ip = `${subnet}.${i}`;
        promises.push(
          testPort(ip, port).then((open) => {
            checked++;
            if (onProgress) onProgress(Math.round((checked / total) * 100));
            if (open) {
              found.push({ ip, port });
              if (onFound) onFound({ ip, port });
            }
          })
        );
      }
      await Promise.all(promises);
    }
  }

  return found;
}

module.exports = { scanNetwork, testPort, getLocalSubnets };
