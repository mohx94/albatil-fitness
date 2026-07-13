window.AF = window.AF || {};

AF.Panel = function({children, style}){
  return h('section',{style:Object.assign({
    background:'linear-gradient(145deg, var(--surface), #0c121c)',
    border:'1px solid var(--line)', borderRadius:22, padding:18, marginTop:14,
    boxShadow:'var(--shadow)'
  },style)}, children);
};

AF.SectionTitle = function({title, right}){
  return h('div',{style:{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,marginBottom:10}},
    h('h3',{style:{margin:0}}, title),
    right?h('span',{style:{color:'var(--muted)',fontSize:12}}, right):null
  );
};

AF.StatCard = function({label, value, unit}){
  return h('article',{style:{background:'var(--surface)',border:'1px solid var(--line)',borderRadius:18,padding:16}},
    h('span',{style:{color:'var(--muted)',display:'block',fontSize:13}}, label),
    h('strong',{style:{fontSize:28,display:'block'}}, value),
    unit?h('small',{style:{color:'var(--muted)',display:'block'}}, unit):null
  );
};

AF.PrimaryBtn = function({children, onClick, style, type}){
  return h('button',{type:type||'button', onClick, style:Object.assign({
    border:0,borderRadius:14,padding:'13px 16px',fontWeight:800,
    background:'linear-gradient(135deg, var(--accent), var(--accent2))', color:'#04140f', cursor:'pointer'
  },style)}, children);
};
AF.SecondaryBtn = function({children, onClick, style, type}){
  return h('button',{type:type||'button', onClick, style:Object.assign({
    border:'1px solid var(--line)',borderRadius:14,padding:'13px 16px',fontWeight:800,
    background:'var(--surface2)', color:'var(--text)', cursor:'pointer'
  },style)}, children);
};
AF.GhostBtn = function({children, onClick, style}){
  return h('button',{onClick, style:Object.assign({
    border:'1px solid var(--line)',borderRadius:14,padding:'13px 16px',fontWeight:800,
    background:'transparent', color:'var(--muted)', cursor:'pointer'
  },style)}, children);
};

AF.Toast = function({msg}){
  if(!msg) return null;
  return h('div',{style:{
    position:'fixed',bottom:95,left:'50%',transform:'translateX(-50%)',
    background:'#f3f4f6',color:'#111',padding:'10px 18px',borderRadius:99,fontWeight:800,
    zIndex:99,maxWidth:'88%',textAlign:'center'
  }}, msg);
};

AF.TopBar = function({profileName, onProfileClick}){
  return h('header',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}},
    h('div',null,
      h('div',{style:{color:'var(--accent)',fontSize:12,fontWeight:900,letterSpacing:4}},'ALBATIL'),
      h('h1',{style:{fontSize:26,margin:0,letterSpacing:2}},'FITNESS')
    ),
    h('button',{onClick:onProfileClick, style:{
      display:'flex',alignItems:'center',gap:6,background:'var(--surface)',border:'1px solid var(--line)',
      borderRadius:99,padding:'8px 14px',color:'var(--text)',fontWeight:800,fontSize:13,cursor:'pointer'
    }}, '👤 ', profileName)
  );
};

AF.BottomNav = function({active, onNav}){
  const items = [
    {id:'home', icon:'⌂', label:'الرئيسية'},
    {id:'workouts', icon:'🏋', label:'التمارين'},
    {id:'nutrition', icon:'🍗', label:'التغذية'},
    {id:'progress', icon:'↗', label:'التقدم'},
    {id:'settings', icon:'⚙', label:'الإعدادات'}
  ];
  return h('nav',{style:{
    position:'fixed',bottom:10,left:'50%',transform:'translateX(-50%)',
    width:'min(calc(100% - 20px),700px)',display:'grid',gridTemplateColumns:'repeat(5,1fr)',
    background:'rgba(14,18,26,.94)',backdropFilter:'blur(18px)',border:'1px solid var(--line)',
    borderRadius:20,padding:7,zIndex:20
  }},
    items.map(it=>h('button',{key:it.id, onClick:()=>onNav(it.id), style:{
      border:0,background:active===it.id?'rgba(40,224,184,.13)':'transparent',
      color:active===it.id?'var(--accent)':'var(--muted)',borderRadius:14,padding:8,
      display:'grid',gap:2,placeItems:'center',cursor:'pointer'
    }},
      h('span',{style:{fontSize:18}}, it.icon),
      h('small',{style:{fontSize:11}}, it.label)
    ))
  );
};

AF.TabBar = function({tabs, active, onChange}){
  return h('div',{style:{
    display:'grid',gridTemplateColumns:`repeat(${tabs.length},1fr)`,gap:6,
    background:'var(--surface)',border:'1px solid var(--line)',borderRadius:16,padding:6,marginBottom:14
  }},
    tabs.map(t=>h('button',{key:t.id, onClick:()=>onChange(t.id), style:{
      border:0, borderRadius:12, padding:'10px 2px', fontWeight:800, fontSize:12, cursor:'pointer',
      background:active===t.id?'linear-gradient(135deg, var(--accent2), var(--violet))':'transparent',
      color:active===t.id?'#fff':'var(--muted)'
    }}, t.label))
  );
};
