const express=require('express'),cors=require('cors'),mongoose=require('mongoose'),bcrypt=require('bcryptjs'),jwt=require('jsonwebtoken');require('dotenv').config();
const app=express();app.set('trust proxy',1);app.disable('x-powered-by');

// FIXED RATE LIMIT with cleanup
const hits=new Map();
app.use((req,res,next)=>{
 if(req.path==='/api/health'||req.path==='/')return next();
 let ip=req.ip||'x';
 let now=Date.now();
 // cleanup old every 5 min
 if(hits.size>500){ for(let [k,v] of hits){ if(now-v.t>60000) hits.delete(k); } }
 let h=hits.get(ip)||{c:0,t:now};
 if(now-h.t>60000) h={c:0,t:now};
 h.c++; hits.set(ip,h);
 if(h.c>200) return res.status(429).json({error:"Too many, slow down"});
 next();
});

const MONGO_URI=process.env.MONGO_URI||process.env.MONGODB_URI||"";
if(!MONGO_URI) console.log("❌ NO MONGO_URI env!");
mongoose.connect(MONGO_URI,{dbName:"genzvisual"}).then(()=>{console.log("Mongo OK");ensureAdmins();}).catch(e=>console.log("Mongo Error",e.message));

const userSchema=new mongoose.Schema({email:{type:String,unique:true,lowercase:true},password:String,role:{type:String,enum:['reader','creator','admin'],default:'reader'},name:String,portfolio:String,bio:String,upiId:{type:String,default:''},createdAt:{type:Date,default:Date.now}});
const User=mongoose.models.User||mongoose.model('User',userSchema);
const novelSchema=new mongoose.Schema({title:String,author:String,genre:String,description:String,cover:String,coverImage:String,content:String,type:String,creatorEmail:String,creatorName:String,chapters:Array,access:{type:String,enum:['free','paid'],default:'free'},price:{type:Number,default:0},authorUpi:{type:String,default:''}},{strict:false,timestamps:true});
const Novel=mongoose.models.Novel||mongoose.model('Novel',novelSchema);
const comicSchema=new mongoose.Schema({title:String,author:String,description:String,cover:String,coverImage:String,pages:Array,type:String,creatorEmail:String,creatorName:String,access:{type:String,enum:['free','paid'],default:'free'},price:{type:Number,default:0},authorUpi:{type:String,default:''}},{strict:false,timestamps:true});
const Comic=mongoose.models.Comic||mongoose.model('Comic',comicSchema);

app.use(cors({origin:true,credentials:true}));app.use(express.json({limit:"50mb"}));

const ADMINS=[{email:"xhettriakash1@gmail.com",password:"Akash123",name:"Akash Main"},{email:"akashchettri2003@gmail.com",password:"Akashchettri2003",name:"Akash Second"}];
async function ensureAdmins(){ try{ for(let a of ADMINS){ if(!await User.findOne({email:a.email})){ let h=await bcrypt.hash(a.password,10); await User.create({email:a.email.toLowerCase(),password:h,role:'admin',name:a.name}); } else await User.updateOne({email:a.email},{role:'admin'}); } }catch(e){console.log("Admin ensure error",e.message)} }

const JWT=process.env.JWT_SECRET||"GENZ_SECRET_2026_SECURE";
const protect=(req,res,next)=>{try{let t=req.headers.authorization?.split(" ")[1];if(!t)return res.status(401).json({error:"Login required"});req.user=jwt.verify(t,JWT);next();}catch{res.status(401).json({error:"Invalid token"});}};
const isAdmin=(req,res,next)=>{if(req.user.role!=='admin')return res.status(403).json({error:"Admin only"});next();};

// HEALTH with keep-alive
app.get('/api/health',(req,res)=>res.json({ok:true,v:"v704.7 FIXED",uptime:process.uptime()}));
app.get('/',(req,res)=>res.send("🟢 v704.7 LIVE + UPI + FIXED"));

async function loginHandler(req,res){let {email,password}=req.body;if(!email||!password) return res.status(400).json({error:"Missing"});let u=await User.findOne({email:email.toLowerCase()});if(!u)return res.status(401).json({error:"Not Found"});if(!await bcrypt.compare(password,u.password))return res.status(401).json({error:"Wrong"});let token=jwt.sign({id:u._id,email:u.email,role:u.role},JWT,{expiresIn:"7d"});res.json({success:true,token,user:{email:u.email,role:u.role,name:u.name,id:u._id,upiId:u.upiId||''}});}
app.post('/api/login',loginHandler);app.post('/api/auth/login',loginHandler);

async function regHandler(req,res){let {email,password,name,role,code}=req.body;if(!email||!password) return res.status(400).json({error:"Missing"});if(await User.findOne({email:email.toLowerCase()}))return res.status(409).json({error:"Exists"});let isAdm=ADMINS.some(a=>a.email===email.toLowerCase());let newRole=isAdm?'admin':(role==='creator'?'creator':'reader');if(role==='creator'&&code&&code!=='CREATOR2026'&&!isAdm)return res.status(403).json({error:"Wrong code"});let h=await bcrypt.hash(password,10);await User.create({email:email.toLowerCase(),password:h,role:newRole,name:name||"
