window.AF = window.AF || {};

AF.HomePage = function({state, cur, mutate, getWorkouts, openWorkout, showScreen}){
  const c = cur();
  const p = c.profile;
  const today = new Date();
  const todayIndex = today.getDay()%3;
  const workouts = getWorkouts();
  const todayWorkout = workouts[todayIndex % workouts.length];
  const streak = AF.computeStreak(c.history);
  const last = c.history[c.history.length-1];
  const draft = c.draft;
  const draftWorkout = draft ? workouts.find(w=>w.id===draft.id) : null;
  const todayKey = AF.dateKey(today);
  const dayLog = c.dailyLog?.[todayKey] || {};
  const todayNutrition = c.nutrition.logs.filter(l=>l.date===todayKey)
    .reduce((a,l)=>({cal:a.cal+l.cal, protein:a.protein+l.protein}), {cal:0,protein:0});
  const t = c.nutrition.targets;

  return h(React.Fragment, null,
    draft ? h('div',{style:{
      display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,
      background:'linear-gradient(135deg, rgba(91,140,255,.16), rgba(139,123,255,.08))',
      border:'1px solid rgba(91,140,255,.3)',borderRadius:18,padding:'14px 16px',marginBottom:14
    }},
      h('div',null,
        h('b',{style:{display:'block'}},'عندك حصة غير مكتملة'),
        h('small',{style:{color:'var(--muted)'}}, draftWorkout ? `${draftWorkout.name} · ${new Date(draft.date).toLocaleTimeString('ar-SA',{hour:'2-digit',minute:'2-digit'})}` : '')
      ),
      h(AF.PrimaryBtn,{onClick:()=>openWorkout(draft.id,true)}, 'استئناف')
    ) : null,

    h('div',{style:{margin:'4px 0 14px'}},
      h('p',{style:{color:'var(--muted)',margin:0}}, `هلا ${c.name||''} 👋 · ${today.toLocaleDateString('ar-SA',{weekday:'long',day:'numeric',month:'long'})}`),
      h('h2',{style:{margin:'4px 0 0'}}, '🔥 اليوم')
    ),

    h('div',{style:{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:12}},
      h(AF.StatCard,{label:'النوم', value:dayLog.sleep??'—', unit:'ساعة'}),
      h(AF.StatCard,{label:'الوزن', value:p.weight, unit:'كجم'}),
      h(AF.StatCard,{label:'السعرات', value:`${Math.round(todayNutrition.cal)} / ${t.calories}`}),
      h(AF.StatCard,{label:'البروتين', value:`${Math.round(todayNutrition.protein)} / ${t.protein}`, unit:'جم'}),
      h(AF.StatCard,{label:'الخطوات', value:(dayLog.steps||0).toLocaleString('en-US')}),
      h(AF.StatCard,{label:'الالتزام', value:streak, unit:streak===1?'يوم':'أيام'})
    ),

    h(AF.Panel,null,
      h('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center'}},
        h('div',null,
          h('span',{style:{display:'block',color:'var(--muted)',fontSize:12}},'تمرين اليوم'),
          h('b',{style:{fontSize:20}}, todayWorkout.name)
        ),
        h(AF.PrimaryBtn,{onClick:()=>openWorkout(todayWorkout.id)}, 'ابدأ الآن')
      ),
      last ? h('div',{style:{marginTop:14,paddingTop:14,borderTop:'1px solid var(--line)',display:'grid',gridTemplateColumns:'repeat(3,1fr)',textAlign:'center'}},
        h('div',null, h('b',{style:{fontSize:16,display:'block'}}, last.name), h('span',{style:{fontSize:11,color:'var(--muted)'}},'آخر تمرين')),
        h('div',{style:{borderRight:'1px solid var(--line)'}}, h('b',{style:{fontSize:16,display:'block'}}, last.durationMin?last.durationMin+' د':'—'), h('span',{style:{fontSize:11,color:'var(--muted)'}},'المدة')),
        h('div',{style:{borderRight:'1px solid var(--line)'}}, h('b',{style:{fontSize:16,display:'block'}}, Math.round(last.volume)), h('span',{style:{fontSize:11,color:'var(--muted)'}},'الحجم كجم'))
      ) : null
    ),

    h('button',{onClick:()=>showScreen('coach'), style:{
      width:'100%', marginTop:14, border:0, borderRadius:18, padding:18, cursor:'pointer',
      background:'linear-gradient(135deg, var(--violet), var(--accent2))', color:'#fff', fontWeight:800,
      display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:15
    }}, h('span',null,'🤖 المدرب الذكي الأسبوعي'), h('span',null,'التحليل والتوصيات ›'))
  );
};
