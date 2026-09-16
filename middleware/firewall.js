// firewall.js - Friendly Firewall - No domain lock, only hacker protection
const blockedIPs = new Map();

function friendlyFirewall(req, res, next) {
  // Skip health checks
  if (req.path === '/' || req.path === '/api/health') return next();

  let ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  let now = Date.now();

  // Block bad patterns (hacker attacks) - but allow normal users
  let bodyStr = JSON.stringify(req.body || {}).toLowerCase();
  let urlStr = (req.url || '').toLowerCase();
  
  const hackerPatterns = [
    '<script', 'union select', 'drop table', '../', '..\\',
    'etc/passwd', 'eval(', 'base64_decode'
  ];
  
  for (let p of hackerPatterns) {
    if (bodyStr.includes(p) || urlStr.includes(p)) {
      console.log(`🚫 Hacker blocked from ${ip}: ${p}`);
      return res.status(403).json({error: "Blocked - suspicious request"});
    }
  }

  // Friendly rate limit - 300 req/min (normal users OK, bots blocked)
  let data = blockedIPs.get(ip) || { count: 0, time: now, blockedUntil: 0 };
  
  if (now < data.blockedUntil) {
    return res.status(429).json({error: "Too many requests - wait 1 min"});
  }
  
  if (now - data.time > 60000) {
    data = { count: 0, time: now, blockedUntil: 0 };
  }
  
  data.count++;
  if (data.count > 300) {
    data.blockedUntil = now + 60000;
    console.log(`⚠️ Rate limit ${ip}`);
  }
  
  blockedIPs.set(ip, data);
  next();
}

setInterval(() => {
  let now = Date.now();
  for (let [k,v] of blockedIPs) {
    if (now - v.time > 120000) blockedIPs.delete(k);
  }
}, 60000);

module.exports = friendlyFirewall;
