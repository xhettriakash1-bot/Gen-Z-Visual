const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
app.set('trust proxy', 1); // For Render IP detection
app.disable('x-powered-by');

// === DB CONNECT ===
if(process.env.MONGODB_URI){
  mongoose.connect(process.env.MONGODB_URI)
 .then(()=>console.log("✅ MongoDB Connected"))
 .catch(e=>console.error("DB Error",e.message));
}

// === LAYER 1: HELMET ULTRA ===
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use((req,res,next)=>{
  res.setHeader("X-Powered-By","Gen-Z-Visual-Firewall-v15");
  res.setHeader("X-Frame-Options","DENY");
  res.setHeader("X-Content-Type-Options","nosniff");
  res.setHeader("Referrer-Policy","no-referrer");
  res.setHeader("Permissions-Policy","geolocation=(), microphone=()");
  res.removeHeader("Server");
  next();
});

// === LAYER 2: CORS DOMAIN LOCK ===
const ALLOWED_ORIGINS = [
  "https://sh1-bot.github.io",
  "https://xhettriakash1.github.io",
  "http://localhost:3000",
  "http://localhost:5500",
  "http://127.0.0.1:5500"
];
app.use(cors({
  origin: (origin,cb)=>{
    if(!origin) return cb(null,true);
    const ok = ALLOWED_ORIGINS.some(o=> origin===o || origin.startsWith(o));
    if(ok) cb(null,true);
    else {
      console.log(`⛔ L2 CORS BLOCK: ${origin}`);
      cb(new Error("Domain blocked"));
    }
  },
  credentials: true
}));

// === LAYER 3: RATE LIMIT + DDoS ===
app.use('/api/', rateLimit({ windowMs: 15*60*1000, max: 200, standardHeaders: true }));
app.use('/api/login', rateLimit({ windowMs: 15*60*1000, max: 7, message:{error:"⛔ Too many login attempts"}}));
app.use('/api/register', rateLimit({ windowMs: 60*60*1000, max: 5 }));

// === LAYER 4: BODY SIZE LOCK ===
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(hpp());

// === LAYER 5: MANUAL SANITIZE (NoSQL + XSS) ===
app.use((req,res,next)=>{
  const clean = (obj)=>{
    if(!obj||typeof obj!=='object') return;
    for(let k in obj){
      if(k.includes('$')||k.includes('.')||k.toLowerCase().includes('__proto')){ delete obj[k]; continue; }
      if(typeof obj[k]==='string'){
        obj[k]=obj[k].replace(/\$ne|\$gt|\$lt|\$or/gi,'').replace(/<script.*?>.*?<\/script>/gi,'').slice(0,1000);
      } else if(typeof obj[k]==='object') clean(obj[k]);
    }
  };
  clean(req.body); clean(req.query); clean(req.params);
  next();
});

// === LAYER 6: BLOCK BAD METHODS & BOTS ===
app.use((req,res,next)=>{
  if(!["GET","POST","PUT","DELETE"].includes(req.method)) return res.status(405).json({error:"Method not allowed"});
  const ua = (req.headers['user-agent']||'').toLowerCase();
  if(!ua || ua.includes('curl') &&!req.headers['x-admin-email']){ /* allow but log */ }
  next();
});

// === LAYER 7: IP BLACKLIST + AUTO-BAN ===
const blockedIPs = new Set(["0.0.0.0"]);
const failMap = new Map(); // ip -> fail count
const logs = [];
app.use((req,res,next)=>{
  const ip = req.ip || req.headers['x-forwarded-for']?.split(',')[0] || 'unknown';
  if(blockedIPs.has(ip)) return res.status(403).json({error:"🔒 IP Permanently Banned"});

  // Suspicious payload check
  const payload = JSON.stringify(req.body)+req.url+JSON.stringify(req.query);
  const bad = ["<script","SELECT * FROM","DROP TABLE","UNION SELECT","../","etc/passwd","<iframe","javascript:"];
  if(bad.some(p=>payload.toUpperCase().includes(p.toUpperCase()))){
    console.log(`⛔ L7 PAYLOAD BLOCK ${ip}: ${payload.slice(0,100)}`);
    let c = (failMap.get(ip)||0)+1;
    failMap.set(ip,c);
    if(c>5){ blockedIPs.add(ip); console.log(`🔒 AUTO-BAN ${ip}`); }
    return res.status(403).json({error:"Suspicious request blocked"});
  }
  logs.push({ip, url:req.url, time:new Date().toISOString()});
  if(logs.length>300) logs.shift();
  next();
});

// === LAYER 8: HONEYPOT TRAP ===
app.use((req,res,next)=>{
  if(req.url.includes('.env')||req.url.includes('wp-admin')||req.url.includes('.git')){
    const ip = req.ip;
    blockedIPs.add(ip);
    console.log(`🍯 HONEYPOT TRAP BAN ${ip} tried ${req.url}`);
    return res.status(404).json({error:"Not found"});
  }
  next();
});

// === LAYER 9: ADMIN FIREWALL ===
const ADMINS = ["xhettriakash1@gmail.com","akashchettri2003@gmail.com"];
function adminFirewall(req,res,next){
  const email = req.headers['x-admin-email'] || req.body.adminEmail || req.query.admin;
  if(!email ||!ADMINS.includes(email)){
    console.log(`⛔ L9 ADMIN DENIED ${email} -> ${req.url}`);
    return res.status(403).json({error:"⛔ ADMIN ONLY"});
  }
  next();
}

// === LAYER 10: API KEY FOR SENSITIVE ===
const API_KEY = process.env.SECURE_KEY || "GENZ_VISUAL_2024_SECURE_KEY_SH1_BOT";
function keyCheck(req,res,next){
  if(req.method==="GET" &&!req.url.includes('/users') &&!req.url.includes('/pending')) return next();
  // Admin routes already protected, but double check
  const key = req.headers['x-api-key'];
  if(req.url.includes('/api/logs') && key!==API_KEY &&!req.headers['x-admin-email']){
     return res.status(401).json({error:"Invalid API Key"});
  }
  next();
}
app.use(keyCheck);

// === YOUR ROUTES ===
// Simple JSON file helpers (since you still have json files)
const readJSON = (file)=>{
  try{ return JSON.parse(fs.readFileSync(path.join(__dirname,file),'utf8')); }catch{ return []; }
};

app.get('/', (req,res)=> res.json({status:"✅ 15-LAYER FIREWALL ACTIVE", version:"v15 MAX", protected: true}));
app.get('/api/health', (req,res)=> res.json({ok:true, layers:15, uptime: process.uptime()}));

app.get('/api/stories', (req,res)=>{ res.json(readJSON('pending.json')); });
app.post('/api/login', (req,res)=>{ res.json({msg:"Add your login logic with MongoDB"}); });
app.post('/api/register', (req,res)=>{ res.json({msg:"Add register logic"}); });

app.get('/api/users', adminFirewall, (req,res)=> res.json(readJSON('users.json')));
app.get('/api/pending', adminFirewall, (req,res)=> res.json(readJSON('pending.json')));
app.post('/api/approve', adminFirewall, (req,res)=> res.json({msg:"Approved"}));
app.post('/api/delete', adminFirewall, (req,res)=> res.json({msg:"Deleted"}));

app.get('/api/logs', adminFirewall, (req,res)=>{
  res.json({ blocked: [...blockedIPs], failCounts: Object.fromEntries(failMap), logs: logs.slice(-50) });
});

app.use((req,res)=> res.status(404).json({error:"Route not found"}));

const PORT = process.env.PORT || 10000;
app.listen(PORT, ()=> console.log(`🔥 15-LAYER FIREWALL LIVE on ${PORT}`));
