import { useState } from 'react';

export default function CreateNovel() {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [genre, setGenre] = useState('Romance');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [access, setAccess] = useState('free');
  const [price, setPrice] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('https://gen-z-visual-2.onrender.com/api/novels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          author,
          genre,
          description,
          content,
          access,
          price: Number(price)
        })
      });
      const data = await res.json();
      if (data.ok) {
        alert('✅ Novel Published! ' + (access==='paid' ? 'PAID ₹'+price : 'FREE'));
        setTitle(''); setDescription(''); setContent('');
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
      <h2 style={{fontSize:'24px', fontWeight:'bold'}}>📖 Create Novel</h2>
      
      <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Novel Title" style={{width:'100%', padding:'12px', margin:'10px 0', borderRadius:'8px', background:'black', color:'white', border:'1px solid #444'}} />
      
      <input value={author} onChange={e=>setAuthor(e.target.value)} placeholder="Author Name" style={{width:'100%', padding:'12px', margin:'10px 0', borderRadius:'8px', background:'black', color:'white', border:'1px solid #444'}} />
      
      <select value={genre} onChange={e=>setGenre(e.target.value)} style={{width:'100%', padding:'12px', margin:'10px 0', borderRadius:'8px', background:'black', color:'white'}}>
        <option>Romance</option><option>Action</option><option>Fantasy</option><option>Horror</option><option>Comedy</option>
      </select>

      <textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Description" style={{width:'100%', padding:'12px', margin:'10px 0', borderRadius:'8px', background:'black', color:'white', border:'1px solid #444', height:'80px'}} />

      <textarea value={content} onChange={e=>setContent(e.target.value)} placeholder="Write your story here..." style={{width:'100%', padding:'12px', margin:'10px 0', borderRadius:'8px', background:'black', color:'white', border:'1px solid #444', height:'200px'}} />

      <div style={{border:'1px solid #333', padding:'15px', borderRadius:'10px', margin:'15px 0', background:'#1a1a1a'}}>
        <p style={{fontWeight:'bold', marginBottom:'10px'}}>📖 Reading Access (Author decides):</p>
        <div style={{display:'flex', gap:'10px'}}>
          <button type="button" onClick={()=>setAccess('free')} style={{flex:1, padding:'10px', borderRadius:'8px', fontWeight:'bold', background: access==='free' ? '#22c55e' : '#333', color: access==='free' ? 'black' : 'white'}}>🟢 FREE</button>
          <button type="button" onClick={()=>setAccess('paid')} style={{flex:1, padding:'10px', borderRadius:'8px', fontWeight:'bold', background: access==='paid' ? '#facc15' : '#333', color: access==='paid' ? 'black' : 'white'}}>💰 PAID</button>
        </div>
        {access==='paid' && (
          <input type="number" value={price} onChange={e=>setPrice(e.target.value)} placeholder="Set Price ₹ Ex: 49" style={{width:'100%', padding:'12px', marginTop:'10px', borderRadius:'8px', background:'black', color:'white', border:'1px solid #666'}} />
        )}
      </div>

      <button onClick={handleSubmit} disabled={loading} style={{width:'100%', padding:'15px', borderRadius:'10px', background:'#8b5cf6', color:'white', fontWeight:'bold', fontSize:'18px'}}>
        {loading ? 'Publishing...' : '🚀 Publish Novel'}
      </button>
    </div>
  );
                 }
