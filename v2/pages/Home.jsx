window.AF = window.AF || {};

AF.HomePage = function({state, cur, mutate, getWorkouts, openWorkout, showScreen}){
  const c = cur();
  const p = c.profile;
  const today = new Date();
  const todayIndex = today.getDay()%3;
  const workouts = getWorkouts();
  const todayWorkout = workouts[todayIndex % workouts.length];
  const streak = AF.computeStreak(c.history);
  const start = p.weight>p.goal ? Math.max(p.weight,80.5) : p.weight;
  const total = Math.max(0.1, Math.abs(start-p.goal));
  const done = Math.max(0, Math.abs(start-p.weight));
  const percent = Math.min(100, Math.round(c.history.length? done/total*100 : 0));
  const last = c.history[c.history.length-1];
  const draft = c.draft;
  const draftWorkout = draft ? workouts.find(w=>w.id===draft.id) : null;

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

    h('div',{style:{
      background:'linear-gradient(145deg, var(--surface), #0c121c)',border:'1px solid var(--line)',
      borderRadius:22,boxShadow:'var(--shadow)',padding:22,display:'flex',justifyContent:'space-between',alignItems:'center',gap:18
    }},
      h('div',null,
        h('p',{style:{color:'var(--muted)',margin:0}}, `هلا ${c.name||''} 👋`),
        h('h2',{style:{margin:'5px 0 0',fontSize:24,lineHeight:1.3}}, 'جاهز تبني أفضل نسخة منك؟')
      ),
      h(AF.RingChart,{percent, label:percent+'%'})
    ),

    h('div',{style:{
      display:'flex',alignItems:'center',gap:12,
      background:'linear-gradient(135deg, rgba(244,196,105,.14), rgba(244,196,105,.04))',
      border:'1px solid rgba(244,196,105,.3)',borderRadius:18,padding:'12px 16px',marginTop:12
    }},
      h('span',{style:{fontSize:26}}, streak>0?'🔥':'💤'),
      h('div',null,
        h('b',{style:{display:'block',color:'var(--gold)',fontSize:16}}, streak+(streak===1?' يوم':' أيام')),
        h('small',{style:{color:'var(--muted)'}},'الالتزام المتواصل')
      )
    ),

    h('div',{style:{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:12,margin:'14px 0'}},
      h(AF.StatCard,{label:'الوزن الحالي', value:p.weight, unit:'كجم'}),
      h(AF.StatCard,{label:'الهدف', value:p.goal, unit:'كجم'}),
      h(AF.StatCard,{label:'نسبة الدهون', value:p.fat, unit:'%'}),
      h(AF.StatCard,{label:'تمارين مكتملة', value:c.history.length, unit:'حصة'})
    ),

    h(AF.PrimaryBtn,{onClick:()=>openWorkout(todayWorkout.id), style:{width:'100%',padding:18,display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:17,margin:'4px 0 14px'}},
      h('span',null,'ابدأ تمرين اليوم'), h('small',null, todayWorkout.name)
    ),

    h(AF.Panel,null,
      h(AF.SectionTitle,{title:'آخر نشاط', right: last?new Date(last.date).toLocaleDateString('ar-SA'):'لا يوجد بعد'}),
      h('div',{style:{display:'grid',gridTemplateColumns:'repeat(3,1fr)',textAlign:'center',marginTop:18}},
        h('div',null, h('b',{style:{fontSize:18,display:'block'}}, last?.name||'—'), h('span',{style:{fontSize:11,color:'var(--muted)'}},'التمرين')),
        h('div',{style:{borderRight:'1px solid var(--line)'}}, h('b',{style:{fontSize:18,display:'block'}}, last?.sets||0), h('span',{style:{fontSize:11,color:'var(--muted)'}},'الجولات')),
        h('div',{style:{borderRight:'1px solid var(--line)'}}, h('b',{style:{fontSize:18,display:'block'}}, Math.round(last?.volume||0)), h('span',{style:{fontSize:11,color:'var(--muted)'}},'الحجم كجم'))
      )
    )
  );
};
