import { useState, useEffect } from 'react';

const API = "https://gen-z-visual-2.onrender.com";

export default function CreateComic() {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const [pages, setPages] = useState(['']);
  const [access, setAccess] = useState('free');
  const [price, setPrice] = useState(10);
  const [loading, setLoading] = useState(false);
  const [upi, setUpi] = useState('');
  const [apiUp, setApiUp] = useState(false);

  useEffect(()=>{ 
    fetch(API+"/").then(()=>setApiUp(true)).catch(()=>setApiUp(false));
    const token=localStorage.getItem('token')||localStorage.getItem('genz_token');
    if(token){
      fetch(API+"/api/me",{headers:{Authorization:`Bearer ${token}`}})
        .then(r=>r.json()).then(u=>{ 
          if(u?.upiId) setUpi(u.upiId); 
          if(u?.email) setAuthor(prev=>prev||u.email);
        }).catch(()=>{});
    }
  },[]);

  const addPage = () => setPages([...pages, '']);
  const removePage = (i) => setPages(pages.filter((_,idx)=>idx!==i));
  const updatePage = (i, val) => {
    const newPages = [...pages];
    newPages[i] = val;
    setPages(newPages);
  };

  const isValidUrl = (s) => {
    try{ const u=new URL(s); return u.protocol==='http:'||u.protocol==='https:'; }catch{return false;}
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validPages = pages.map(p=>p.trim()).filter(p=>p && isValidUrl(p));
    if(!title.trim() || title.trim().length<2) return alert("❌ Title min 2 chars");
    if(validPages.length===0) return alert("❌ Need at least 1 valid https:// image URL for page");
    if(access==='paid'){
      if(!upi.includes('@')) return alert("❌ Save UPI first in Dashboard! PAID needs UPI");
      if(Number(price)<10) return alert("❌ PAID price min ₹10");
    }
    
    setLoading(true);
    try {
      await fetch(API+"/",{cache:"no-store"});
      const token = localStorage.getItem('token')||localStorage.getItem('genz_token');
      const res = await fetch(`${API}/api/comics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: title.trim(),
          author: author.trim()||'GenZ Creator',
          description: description.trim(),
          pages: validPages,
          cover: validPages[0] || '',
          access,
          price: access==='paid'? Number(price) : 0
        })
      });
      const data = await res.json();
      if (data.ok || data.comic) {
        alert('✅ Comic Published LIVE v705! ' + (access==='paid'? 'PAID ₹'+price : 'FREE') + '\nID: '+(data.comic?._id||data._id||''));
        setTitle(''); setDescription(''); setPages(['']); setPrice(10); setAccess('free');
      } else {
        alert('Error: ' + (data.error||JSON.stringify(data)));
      }
    } catch (err) {
      alert('Error: ' + err.message + " - Backend waking, try again in 20s");
    }
    setLoading(false);
  };

  return (
    <div style={{maxWidth:'600px', margin:'20px auto', padding:'20px', background:'#121212', color:'white', borderRadius:'20px', fontFamily:'system-ui', border:'1px solid #222'}}>
      <h2 style={{fontSize:'22px', fontWeight:'900'}}>🎨 Create Comic <span style={{fontSize:'10px', background: apiUp?'#00ff88':'#333', color:'#000', padding:'4px 8px', borderRadius:'20px'}}>v705 PRO {apiUp? 'LIVE':'Waking...'}</span></h2>
      {upi ? <p style={{fontSize:'11px', color:'#00ff88', background:'#00ff8815', padding:'6px 10px', borderRadius:'8px'}}>💳 UPI: {upi} ✅ PAID enabled</p> : <p style={{fontSize:'11px', color:'#ffaa00'}}>⚠️ No UPI — PAID will be blocked. Save UPI in Dashboard.</p>}

      <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Comic Title * min 2 chars" style={{width:'100%', padding:'12px', margin:'8px 0', borderRadius:'10px', background:'black', color:'white', border:'1px solid #333'}} />

      <input value={author} onChange={e=>setAuthor(e.target.value)} placeholder="Author Name" style={{width:'100%', padding:'12px', margin:'8px 0', borderRadius:'10px', background:'black', color:'white', border:'1px solid #333'}} />

      <textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Description * (min 10 chars)" style={{width:'100%', padding:'12px', margin:'8px 0', borderRadius:'10px', background:'black', color:'white', border:'1px solid #333', height:'80px'}} />

      <p style={{marginTop:'12px', fontWeight:'800', fontSize:'13px'}}>📄 Pages (Image URLs) * — first URL = auto cover:</p>
      {pages.map((p,i)=>(
        <div key={i} style={{display:'flex', gap:'6px', margin:'6px 0'}}>
          <input value={p} onChange={e=>updatePage(i,e.target.value)} placeholder={`Page ${i+1} https://...`} style={{flex:1, padding:'10px', borderRadius:'8px', background:'#1a1a1a', color:'white', border:`1px solid ${p && !isValidUrl(p) ? '#ff0055' : '#333'}`}} />
          {pages.length>1 && <button type="button" onClick={()=>removePage(i)} style={{background:'#ff0055', color:'#fff', border:'none', padding:'0 12px', borderRadius:'8px', fontWeight:'800'}}>X</button>}
        </div>
      ))}
      <button type="button" onClick={addPage} style={{width:'100%', padding:'10px', background:'#222', color:'#fff', border:'1px dashed #444', borderRadius:'10px', marginTop:'6px'}}>+ Add Page URL</button>

      <div style={{display:'flex', gap:'8px', marginTop:'14px'}}>
        <select value={access} onChange={e=>setAccess(e.target.value)} style={{flex:1, padding:'12px', borderRadius:'10px', background:'#1a1a1a', color:'#fff', border:'1px solid #333'}}>
          <option value="free">FREE - Public</option>
          <option value="paid">PAID - ₹ Locked</option>
        </select>
        {access==='paid' && <input type="number" min="10" max="999" value={price} onChange={e=>setPrice(e.target.value)} placeholder="₹ Price min 10" style={{flex:1, padding:'12px', borderRadius:'10px', background:'#1a1a1a', color:'#fff', border:'1px solid #facc15'}} />}
      </div>

      <button onClick={handleSubmit} disabled={loading} style={{width:'100%', padding:'14px', marginTop:'14px', borderRadius:'99px', background: loading?'#333':'#fff', color: loading?'#888':'#000', border:'none', fontWeight:'900', cursor:'pointer'}}>
        {loading ? 'Publishing LIVE...' : `🚀 Publish ${access==='paid'? 'PAID ₹'+price : 'FREE'} Comic v705`}
      </button>
      <p style={{fontSize:'10px', color:'#666', marginTop:'8px', textAlign:'center'}}>v705 PRO • Auto validates URLs • Blocks PAID if no UPI • Cover auto from Page 1</p>
    </div>
  );
                                                      }
