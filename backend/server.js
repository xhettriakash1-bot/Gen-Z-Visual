const express=require('express'),cors=require('cors'),mongoose=require('mongoose'),bcrypt=require('bcryptjs'),jwt=require('jsonwebtoken');require('dotenv').config();
const app=express();app.set('trust proxy',1);app.disable('x-powered-by');

// ADVANCE RATE LIMIT + AUTO CLEAN every 30s
const hits=new Map(); setInterval(()=>{ let now=Date.now(); for(let [k,v] of hits){ if(now-v.t>60000) hits.delete(k); } },30000);
app.use((req,res,next)=>{
 if(req.path==='/api/health'||req.path==='/')return next();
 let ip=req.ip||'x',now=Date.now(),h=hits.get(ip)||{c:0,t:now};
 if(now-h.t>60000) h={c:0,t:now}; h.c++; hits.set(ip,h);
 if(h.c>250) return res.status(429).json({error:"Too fast! Wait 1 min bro"});
 next();
});

const MONGO_URI=process.env.MONGO_URI||process.env.MONGODB_URI||""; if(!MONGO_URI) console.log("❌ NO MONGO_URI");
mongoose.connect(MONGO_URI,{dbName:"genzvisual"}).then(()=>{console.log("✅ Mongo v705 PRO OK");ensureAdmins();}).catch(e=>console.log("Mongo Error",e.message));

const userSchema=new mongoose.Schema({email:{type:String,unique:true,lowercase:true},password:String,role:{type:String,enum:['reader','creator','admin'],default:'reader'},name:String,portfolio:String,bio:String,upiId:{type:String,default:''},createdAt:{type:Date,default:Date.now}});
const User=mongoose.models.User||mongoose.model('User',userSchema);

const novelSchema=new mongoose.Schema({title:String,author:String,genre:String,description:String,cover:String,coverImage:String,content:String,type:String,creatorEmail:String,creatorName:String,chapters:Array,access:{type:String,enum:['free','paid'],default:'free'},price:{type:Number,default:0},authorUpi:String,slug:String,views:{type:Number,default:0},isPublished:{type:Boolean,default:true}},{strict:false,timestamps:true});
const Novel=mongoose.models.Novel||mongoose.model('Novel',novelSchema);

const comicSchema=new mongoose.Schema({title:String,author:String,description:String,cover:String,coverImage:String,pages:Array,type:String,creatorEmail:String,creatorName:String,access:{type:String,enum:['free','paid'],default:'free'},price:{type:Number,default:0},authorUpi:String,slug:String,pageCount:Number,views:{type:Number,default:0},isPublished:{type:Boolean,default:true}},{strict:false,timestamps:true});
const Comic=mongoose.models.Comic||mongoose.model('Comic',comicSchema);

app.use(cors({origin:true,credentials:true}));app.use(express.json({limit:"50mb"}));

const ADMINS=[{email:"xhettriakash1@gmail.com",password:"Akash123",name:"Akash Main"},{email:"akashchettri2003@gmail.com",password:"Akashchettri2003",name:"Akash Second"}];
async function ensureAdmins(){try{for(let a of ADMINS){if(!await User.findOne({email:a.email})){let h=await bcrypt.hash(a.password,10);await User.create({email:a.email.toLowerCase(),password:h,role:'admin',name:a.name});}else await User.updateOne({email:a.email},{role:'admin'});} }catch(e){console.log("Admin error",e.message)}}

const JWT=process.env.JWT_SECRET||"GENZ_SECRET_2026_SECURE";
const protect=(req,res,next)=>{try{let t=req.headers.authorization?.split(" ")[1];if(!t)return res.status(401).json({error:"Login required - token missing"});req.user=jwt.verify(t,JWT);next();}catch{res.status(401).json({error:"Invalid token - login again"});}};
const isAdmin=(req,res,next)=>{if(req.user.role!=='admin')return res.status(403).json({error:"Admin only"});next();};

// HELPERS - ADVANCE DYNAMIC
function slugify(t){return (t||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,60).replace(/-$/,'');}
function isValidUrl(u){try{let x=new URL(u);return x.protocol==='http:'||x.protocol==='https:';}catch{return false;}}
function cleanPages(p){if(!Array.isArray(p)) return []; return [...new Set(p.map(s=>String(s||'').trim()).filter(s=>s.length>10 && isValidUrl(s)))].slice(0,100);}

// HEALTH
app.get('/api/health',(
