const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();

// ================= FIREWALL 1: SECURITY HEADERS & CORS =================
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.removeHeader('X-Powered-By');
  next();
});

const ALLOWED_ORIGINS = [
  "https://xhettriakash1.github.io",
  "http://localhost:3000",
  "http://127.0.0.1:5500",
  "http://localhost:5500"
];

app.use(cors({
  origin: function(origin, callback){
    if(!origin || ALLOWED_ORIGINS.some(o => origin.startsWith(o))){
      callback(null, true);
    } else {
      console.log(`BLOCKED CORS FROM: ${origin}`);
      callback(new Error('Blocked by Firewall'));
    }
  }
}));

app.use(express.json({limit: '10kb'}));
app.use(express.static(path.join(__dirname, '..')));

// ================= FIREWALL 2: RATE LIMITER + IP BLACKLIST =================
const ipRequestCount = new Map();
const BLACKLIST = new Set();
const blacklistFile = path.join(__dirname, 'blacklist.json');

if(fs.existsSync(blacklistFile)){
  try { JSON.parse(fs.readFileSync(blacklistFile)).forEach(ip => BLACKLIST.add(ip)); } catch(e){}
}

app.use((req, res, next) => {
  const ip = req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress;
  if(BLACKLIST.has(ip)){
    return res.status(403).json({error: 'IP blocked by Firewall'});
  }
  const now = Date.now();
  const record = ipRequestCount.get(ip) || {count: 0, time: now};
  if(now - record.time > 60 * 1000){
    record.count = 1; record.time = now;
  } else { record.count++; }
  ipRequestCount.set(ip, record);
  if(record.count > 50){
    BLACKLIST.add(ip);
    try { fs.writeFileSync(blacklistFile, JSON.stringify([...BLACKLIST])); } catch(e){}
    console.log(`🔥 DDOS BLOCKED: ${ip}`);
    return res.status(429).json({error: 'Too many requests - blocked'});
  }
  next();
});

// ================= FIREWALL 3: HACKER INPUT FILTER =================
const HACK_PATTERNS = [
  /union.*select/i,
  /select.*from/i,
  /<script/i,
  /\.\.\//,
  /base64_decode/i,
  /eval\(/i
];
function isAttack(input){
  if(!input) return false;
  const str = JSON.stringify(input).toLowerCase();
  return HACK_PATTERNS.some(p => p.test(str));
}
app.use((req, res, next) => {
  if(isAttack(req.body) || isAttack(req.query)){
    const ip = req.headers['x-forwarded-for'] || req.ip;
    console.log(`🚨 HACK BLOCKED from ${ip}: ${req.url}`);
    return res.status(403).json({error: 'Malicious request blocked by WAF'});
  }
  next();
});

// ================= YOUR ORIGINAL CODE - FIXED (NO DUPLICATE) =================
const ADMINS = [
 {email:"akashchettri2003@gmail.com", password:"Akashchettri2003@123#"},
 {email:"xhettriakash1@gmail.com", password:"Akash123"}
];

const USERS_FILE = path.join(__dirname, 'users.json');
const PENDING_FILE = path.join(__dirname, 'pending.json');

function getUsers(){ if(!fs.existsSync(USERS_FILE)) return []; return JSON.parse(fs.readFileSync(USERS_FILE,'utf8')); }
function saveUsers(d){ fs.writeFileSync(USERS_FILE, JSON.stringify(d,null,2)); }
function getPending(){ if(!fs.existsSync(PENDING_FILE)) return []; return JSON.parse(fs.readFileSync(PENDING_FILE,'utf8')); }
function savePending(d){ fs.writeFileSync(PENDING_FILE, JSON.stringify(d,null,2)); }

app.post('/api/signup', (req,res)=>{
 const {name,email,password,role,code,portfolio,bio} = req.body;
 if(!name||!email||!password) return res.json({ok:false, msg:"Fill all fields"});
 if(ADMINS.find(a=>a.email==email)) return res.json({ok:false, msg:"Admin email reserved"});
 if(role=="creator" && code!=="CREATOR2026") return res.json({ok:false, msg:"Wrong creator code! Use CREATOR2026"});
 let users=getUsers();
 if(users.find(u=>u.email==email)) return res.json({ok:false, msg:"Email already exists"});
 let newUser={name,email,password,role,portfolio:portfolio||"",bio:bio||"",verified:role=="reader",date:new Date().toLocaleString()};
 users.push(newUser); saveUsers(users);
 if(role=="creator"){ let p=getPending(); p.push({name,email,portfolio,bio,date:new Date().toLocaleString()}); savePending(p); }
 res.json({ok:true, msg:"Account created as "+role});
});

app.post('/api/login', (req,res)=>{
 const {email,password}=req.body;
 let admin=ADMINS.find(a=>a.email==email && a.password==password);
 if(admin) return res.json({ok:true, role:"admin", name:"Admin"});
 let users=getUsers();
 let u=users.find(x=>x.email==email && x.password==password);
 if(!u) return res.json({ok:false, msg:"Wrong email/password"});
 res.json({ok:true, role:u.role, name:u.name, email:u.email});
});

app.get('/api/users', (req,res)=> res.json(getUsers()));
app.get('/api/pending', (req,res)=> res.json(getPending()));

app.post('/api/approve', (req,res)=>{
 const {email}=req.body;
 let users=getUsers(); let idx=users.findIndex(u=>u.email==email); if(idx>=0) users[idx].verified=true; saveUsers(users);
 let pending=getPending(); pending=pending.filter(p=>p.email!==email); savePending(pending);
 res.json({ok:true});
});

app.post('/api/delete', (req,res)=>{
 const {email}=req.body;
 let users=getUsers(); users=users.filter(u=>u.email!==email); saveUsers(users);
 let pending=getPending(); pending=pending.filter(p=>p.email!==email); savePending(pending);
 res.json({ok:true});
});

// IMPORTANT FOR RENDER - use process.env.PORT
const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log(`✅ Server running on ${PORT}`));
