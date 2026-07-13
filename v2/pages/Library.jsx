window.AF = window.AF || {};

AF.LibraryPage = function({cur, mutate, getWorkouts, showScreen}){
  const c = cur();
  const workouts = getWorkouts();
  const promptVideo = (name)=>{
    const url = prompt('رابط فيديو الشرح (يوتيوب مثلًا):', c.videoLinks?.[name]||'');
    if(url===null) return;
    mutate((next,p)=>{
      if(!p.videoLinks) p.videoLinks={};
      if(url.trim()) p.videoLinks[name]=url.trim(); else delete p.videoLinks[name];
    });
  };
  return h(React.Fragment, null,
    h('div',{style:{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}},
      h(AF.GhostBtn,{onClick:()=>showScreen('workouts')},'رجوع'),
      h('div',null, h('p',{style:{color:'var(--muted)',margin:0}},'شرح مبسّط وبدائل لكل تمرين'), h('h2',{style:{margin:0}},'مكتبة التمارين')),
      h('div',null)
    ),
    workouts.map(w=>h(React.Fragment,{key:w.id},
      h('div',{style:{display:'flex',alignItems:'center',justifyContent:'space-between',margin:'18px 2px 8px'}},
        h('h3',{style:{margin:0}}, w.name), h('span',{style:{color:'var(--muted)',fontSize:12}}, w.subtitle)
      ),
      w.groups.flatMap(([g,exs])=>exs.map(([name,sets,reps])=>{
        const info = AF.EX_INFO[name];
        const vid = c.videoLinks?.[name];
        return h('article',{key:g+name, style:{background:'var(--surface)',border:'1px solid var(--line)',borderRadius:20,padding:16,marginBottom:12}},
          h('div',{style:{marginBottom:6}}, h('h3',{style:{margin:0}}, name), h('small',{style:{color:'var(--accent)'}}, `${g} · ${sets}×${reps}`)),
          h('div',{style:{background:'var(--surface2)',border:'1px solid var(--line)',borderRadius:12,padding:'10px 12px',marginBottom:10,fontSize:12,color:'var(--muted)'}},
            info ? [h('b',{key:'t',style:{color:'var(--text)'}},'💡 نصيحة: '), info.tip, info.alt&&info.alt.length? h('span',{key:'a'}, h('br'), h('b',{style:{color:'var(--text)'}},'🔁 بدائل: '), info.alt.join('، ')):null] : 'لا توجد ملاحظات إضافية لهذا التمرين بعد.'
          ),
          h('div',{style:{display:'flex',gap:8,flexWrap:'wrap'}},
            vid ? h('a',{href:vid, target:'_blank', style:{fontSize:11,color:'var(--accent2)',background:'var(--surface2)',border:'1px solid var(--line)',borderRadius:99,padding:'4px 10px',textDecoration:'none'}}, '▶️ مشاهدة الشرح') : null,
            h('button',{onClick:()=>promptVideo(name), style:{fontSize:11,color:'var(--accent2)',background:'transparent',border:'1px solid var(--line)',borderRadius:99,padding:'4px 10px',cursor:'pointer'}}, vid?'✏️ تعديل الرابط':'🎬 أضف رابط شرح')
          )
        );
      }))
    ))
  );
};
