/**
 * Local Wi-Fi Download & Play Server for Android Smartphone
 * Usage: node server.js
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 8080;

function getLocalIPs() {
  const nets = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        ips.push(net.address);
      }
    }
  }
  return ips.length ? ips : ['localhost'];
}

const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];

  if (urlPath === '/download' || urlPath === '/BakumoriDonburiTower.apk') {
    const apkPath = path.join(__dirname, 'BakumoriDonburiTower.apk');
    if (fs.existsSync(apkPath)) {
      const stat = fs.statSync(apkPath);
      res.writeHead(200, {
        'Content-Type': 'application/vnd.android.package-archive',
        'Content-Disposition': 'attachment; filename="BakumoriDonburiTower.apk"',
        'Content-Length': stat.size
      });
      fs.createReadStream(apkPath).pipe(res);
      return;
    }
  }

  if (urlPath === '/install') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Androidアプリ ダウンロード - 爆盛！どんぶりタワー</title>
<style>
  body { background:#1a0d00; color:#fff; font-family:sans-serif; text-align:center; padding:24px; }
  .card { max-width:420px; margin:0 auto; background:#2b1505; border:3px solid #ffcc00; border-radius:16px; padding:20px; }
  .btn { display:block; margin:16px 0; padding:16px; background:linear-gradient(180deg,#ff9800,#e65100); color:#fff; text-decoration:none; font-weight:900; font-size:18px; border-radius:12px; border:2px solid #fff; }
  .btn.sub { background:linear-gradient(180deg,#4caf50,#2e7d32); font-size:15px; }
</style>
</head>
<body>
  <div class="card">
    <img src="/icon.png" width="96" height="96" style="border-radius:20px;border:2px solid #ffcc00;">
    <h2>🍚 爆盛！どんぶりタワー</h2>
    <p style="color:#ffe082;font-size:14px;">Androidスマホ用 インストーラー (.apk)</p>
    <a class="btn" href="/BakumoriDonburiTower.apk">📥 APKをダウンロードしてインストール</a>
    <a class="btn sub" href="/index.html">🎮 ブラウザですぐに遊ぶ (PWA対応)</a>
    <p style="font-size:12px;color:#ccc;text-align:left;line-height:1.5;">
      ※インストール時に「不明なアプリのインストール」の確認が出た場合は「許可」してインストールしてください（独自署名v1/v2検証済みパッケージです）。
    </p>
  </div>
</body>
</html>`);
    return;
  }

  let filePath = path.join(__dirname, urlPath === '/' ? 'index.html' : urlPath);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(__dirname, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.png': 'image/png',
    '.apk': 'application/vnd.android.package-archive'
  };

  res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, '0.0.0.0', () => {
  const ips = getLocalIPs();
  console.log('====================================================');
  console.log('🍚 爆盛！どんぶりタワー 配信サーバー起動完了！');
  for (const ip of ips) {
    console.log(`📱 スマホからAPKインストール: http://${ip}:${PORT}/install`);
    console.log(`🎮 ブラウザで即プレイ:       http://${ip}:${PORT}/`);
  }
  console.log('====================================================');
});
