const { execFile } = require('child_process');
const { promisify } = require('util');
const { apiRequest } = require('./auth');
const { testPort } = require('./network');
const escpos = require('escpos');
escpos.USB = require('escpos-usb');

const execFileAsync = promisify(execFile);

async function listUsbPrintersWindows() {
  const psScript = `
    $printers = Get-Printer | Where-Object { $_.PortName -like "USB*" } | Select-Object Name,PortName;
    $printers | ConvertTo-Json -Compress
  `.trim();
  try {
    const { stdout } = await execFileAsync('powershell.exe', ['-NoProfile', '-Command', psScript], { timeout: 4000 });
    if (!stdout) return [];
    const parsed = JSON.parse(stdout);
    const arr = Array.isArray(parsed) ? parsed : [parsed];
    return arr.map((p) => ({
      name: String(p?.Name || '').trim(),
      port: String(p?.PortName || '').trim(),
    })).filter((p) => p.name);
  } catch {
    return [];
  }
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function usbPrinterMatches(configPrinter, usbPrinters) {
  const id = normalizeText(configPrinter?.usb_identifier || '');
  if (id) {
    return usbPrinters.some((u) => normalizeText(u.identifier) === id);
  }
  const desiredName = normalizeText(configPrinter?.name || configPrinter?.ip_address || '');
  if (!desiredName) return usbPrinters.length > 0;
  return usbPrinters.some((u) => normalizeText(u.name).includes(desiredName) || desiredName.includes(normalizeText(u.name)));
}

function listEscposUsbPrinters() {
  try {
    const devices = escpos.USB.findPrinter() || [];
    return devices.map((d) => {
      const vid = Number(d?.deviceDescriptor?.idVendor || 0).toString(16).toUpperCase().padStart(4, '0');
      const pid = Number(d?.deviceDescriptor?.idProduct || 0).toString(16).toUpperCase().padStart(4, '0');
      return {
        name: `USB ${vid}:${pid}`,
        port: 'USB',
        identifier: `VID:${vid}_PID:${pid}`,
      };
    });
  } catch {
    return [];
  }
}

async function detectPrinters(apiUrl, printToken) {
  try {
    const printers = await apiRequest(apiUrl, '/impressoras/agente/printers', printToken);
    const configured = Array.isArray(printers) ? printers : [];
    const usbPrinters = [
      ...listEscposUsbPrinters(),
      ...(await listUsbPrintersWindows()).map((p) => ({ ...p, identifier: '' })),
    ];

    const detected = [];
    for (const p of configured) {
      const type = String(p?.type || 'ip').toLowerCase() === 'usb' ? 'usb' : 'ip';
      let online = false;
      if (!p?.is_active) {
        online = false;
      } else if (type === 'usb') {
        online = usbPrinterMatches(p, usbPrinters);
      } else {
        const ip = String(p?.ip_address || '').trim();
        const port = Number(p?.port || 9100);
        online = ip ? await testPort(ip, port, 1200) : false;
      }

      detected.push({
        id: String(p?.id || ''),
        sector: String(p?.sector || '').toLowerCase(),
        name: String(p?.name || ''),
        type,
        status: online ? 'online' : 'offline',
        lastSeenAt: new Date().toISOString(),
      });
    }
    return detected;
  } catch {
    return [];
  }
}

module.exports = {
  detectPrinters,
};

