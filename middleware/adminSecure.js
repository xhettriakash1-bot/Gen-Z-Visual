// adminSecure.js - Confidential Admin Login Protection
const adminLoginAttempts = new Map();

function adminLoginFirewall(req, res, next) {
  // Only protect login route
  if (!req.path.includes('/auth/login')) return next();

  let ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  let now = Date.now();
  let data = adminLoginAttempts.get(ip) || { count: 0, time: now, blockedUntil: 0 };

  if (now < data.blockedUntil) {
    let wait = Math.ceil((data.blockedUntil - now)/1000);
    return res.status(429).json({error: `Admin login blocked - wait ${wait}s - too many tries`});
  }

  if (now - data.time > 15*60*1000) { // reset after 15 min
    data = { count: 0, time: now, blockedUntil: 0 };
  }

  data.count++;

  // After 10 failed tries, block 15 min
  if (data.count > 10) {
    data.blockedUntil = now + 15*60*1000;
    console.log(`🔒 Admin brute force blocked: ${ip}`);
    adminLoginAttempts.set(ip, data);
    return res.status(429).json({error: "Admin login locked 15 min - hacker protection"});
  }

  adminLoginAttempts.set(ip, data);
  
  // Hide email in logs - confidential
  if (req.body && req.body.email) {
    console.log(`🔐 Admin login attempt from ${ip}`);
  }
  
  next();
}

function clearOnSuccess(ip) {
  adminLoginAttempts.delete(ip);
}

module.exports = { adminLoginFirewall, clearOnSuccess };
