const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

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

app.listen(3000, ()=> console.log("✅ http://localhost:3000"));
