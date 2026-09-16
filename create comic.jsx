import { useState } from 'react';

export default function CreateComic() {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const [pages, setPages] = useState(['']);
  const [access, setAccess] = useState('free');
  const [price, setPrice] = useState(0);
  const [loading, setLoading] = useState(false);

  const addPage = () => setPages([...pages, '']);
  const updatePage = (i, val) => {
    const newPages = [...pages];
    newPages[i] = val;
    setPages(newPages);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('https://gen-z-visual-2.onrender.com/api/comics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          author,
          description,
          pages: pages.filter(p=>p.trim()!==''),
          cover: pages[0] || '',
          access,
          price: Number(price)
        })
      });
      const data = await res.json();
      if (data.ok) {
        alert('✅ Comic Published! ' + (access==='paid'? 'PAID ₹'+price : 'FREE'));
        setTitle(''); setPages(['']);
      } else {
        alert('Error: ' + (data.error||'Failed'));
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
    setLoading(false);
  };

  return (
    <div style={{maxWidth:'600px', margin:'20px auto', padding:'20px', background:'#111', color:'white', borderRadius:'15px'}}>
      <h2 style={{fontSize:'24px', fontWeight:'bold'}}>🎨 Create Comic</h2>

      <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Comic Title" style={{width:'100%', padding:'12px', margin:'10px 0', borderRadius:'8px', background:'black', color:'white', border:'1px solid #444'}} />

      <input value={author} onChange={e=>setAuthor(e.target.value)} placeholder="Author Name" style={{width:'100%', padding:'12px', margin:'10px 0', borderRadius:'8px', background:'black', color:'white', border:'1px solid #444'}} />

      <textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Description" style={{width:'100%', padding:'12px', margin:'10px 0', borderRadius:'8px', background:'black', color:'white', border:'1px solid #444', height:'80px'}} />

      <p style={{marginTop:'15px', fontWeight:'bold'}}>📄 Comic Pages (Image URLs):</p>
      {pages.map((p,i)=>(
        <input key={i} value={p} onChange={e=>updatePage(i,e.target.value)} placeholder={`Page ${i+1} Image URL`} style={{width:'100%', padding:'12px', margin:'5px 0', borderRadius:'8px', background:'black', color:'white', border:'1px solid #444'}} />
      ))}
      <button type="button" onClick={addPage} style={{padding:'8px 15px', margin:'10px 0', borderRadius:'8px', background:'#333', color:'white'}}>+ Add Page</button>

      <div style={{border:'1px solid #333', padding:'15px', borderRadius:'10px', margin:'15px 0', background:'#1a1a1a'}}>
        <p style={{fontWeight:'bold', marginBottom:'10px'}}>📖 Reading Access (Author decides):</p>
        <div style={{display:'flex', gap:'10px'}}>
          <button type="button" onClick={()=>setAccess('free')} style={{flex:1, padding:'10px', borderRadius:'8px', fontWeight:'bold', background: access==='free'? '#22c55e' : '#333', color: access==='free'? 'black' : 'white'}}>🟢 FREE</button>
          <button type="button" onClick={()=>setAccess('paid')} style={{flex:1, padding:'10px', borderRadius:'8px', fontWeight:'bold', background: access==='paid'? '#facc15' : '#333', color: access==='paid'? 'black' : 'white'}}>💰 PAID</button>
        </div>
        {access==='paid' && (
          <input type="number" value={price} onChange={e=>setPrice(e.target.value)} placeholder="Set Price ₹ Ex: 49" style={{width:'100%', padding:'12px', marginTop:'10px', borderRadius:'8px', background:'black', color:'white', border:'1px solid #666'}} />
        )}
      </div>

      <button onClick={handleSubmit} disabled={loading} style={{width:'100%', padding:'15px', borderRadius:'10px', background:'#ec4899', color:'white', fontWeight:'bold', fontSize:'18px'}}>
        {loading? 'Publishing...' : '🚀 Publish Comic'}
      </button>
    </div>
  );
        }
