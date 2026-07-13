window.AF = window.AF || {};

function ensureCustom(p){
  if(!p.customWorkouts) p.customWorkouts = JSON.parse(JSON.stringify(AF.WORKOUTS));
}
function flatExercises(w){
  return w.groups.flatMap(([g,exs])=>exs.map(e=>({g,e})));
}

AF.ScheduleEditorPage = function({cur, mutate, getWorkouts, showScreen}){
  const workouts = getWorkouts();

  const updateDayName = (di,val)=>mutate((next,p)=>{ ensureCustom(p); p.customWorkouts[di].name=val; });
  const deleteDay = (di)=>{ if(!confirm('حذف هذا اليوم بالكامل؟')) return; mutate((next,p)=>{ ensureCustom(p); p.customWorkouts.splice(di,1); }); };
  const addDay = ()=>mutate((next,p)=>{ ensureCustom(p); p.customWorkouts.push({id:'custom_'+Date.now(),name:'يوم جديد',subtitle:'خصّص التمارين',groups:[['عام',[]]]}); });
  const addExercise = (di)=>mutate((next,p)=>{
    ensureCustom(p);
    const w = p.customWorkouts[di];
    if(!w.groups.length) w.groups.push(['عام',[]]);
    w.groups[0][1].push(['تمرين جديد',3,'8-12']);
  });
  const updateExField = (di,flatI,fieldIdx,val)=>mutate((next,p)=>{
    ensureCustom(p);
    const w = p.customWorkouts[di];
    const flat = flatExercises(w);
    flat[flatI].e[fieldIdx]=val;
  });
  const removeExercise = (di,flatI)=>mutate((next,p)=>{
    ensureCustom(p);
    const w = p.customWorkouts[di];
    const flat = flatExercises(w);
    const target = flat[flatI];
    w.groups.forEach(([g,exs])=>{ const idx=exs.indexOf(target.e); if(idx>-1) exs.splice(idx,1); });
  });
  const resetSchedule = ()=>{
    if(!confirm('استرجاع الجدول الافتراضي وإلغاء كل تعديلاتك؟')) return;
    mutate((next,p)=>{ p.customWorkouts=null; });
  };

  return h(React.Fragment, null,
    h('div',{style:{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}},
      h(AF.GhostBtn,{onClick:()=>showScreen('workouts')},'رجوع'),
      h('div',null, h('p',{style:{color:'var(--muted)',margin:0}},'أضف/احذف أيام وتمارين'), h('h2',{style:{margin:0}},'تخصيص الجدول')),
      h(AF.GhostBtn,{onClick:resetSchedule},'استرجاع الافتراضي')
    ),
    workouts.map((w,di)=>h('div',{key:w.id, style:{background:'var(--surface)',border:'1px solid var(--line)',borderRadius:18,padding:14,marginBottom:14}},
      h('div',{style:{display:'flex',gap:8,alignItems:'center',marginBottom:10}},
        h('input',{defaultValue:w.name, onBlur:e=>updateDayName(di,e.target.value), style:{flex:1,background:'var(--surface2)',border:'1px solid var(--line)',color:'var(--text)',borderRadius:10,padding:'9px 12px',fontWeight:800}}),
        h('button',{onClick:()=>deleteDay(di), style:{background:'rgba(255,97,120,.1)',color:'var(--danger)',border:'1px solid rgba(255,97,120,.2)',borderRadius:14,padding:'10px 14px',cursor:'pointer'}}, 'حذف اليوم')
      ),
      flatExercises(w).map((row,flatI)=>h('div',{key:flatI, style:{display:'grid',gridTemplateColumns:'1fr 50px 60px 30px',gap:6,marginBottom:6}},
        h('input',{defaultValue:row.e[0], onBlur:e=>updateExField(di,flatI,0,e.target.value), style:{background:'var(--surface2)',border:'1px solid var(--line)',color:'var(--text)',borderRadius:8,padding:8,textAlign:'right'}}),
        h('input',{type:'number', defaultValue:row.e[1], onBlur:e=>updateExField(di,flatI,1,+e.target.value||3), style:{background:'var(--surface2)',border:'1px solid var(--line)',color:'var(--text)',borderRadius:8,padding:8,textAlign:'center'}}),
        h('input',{defaultValue:row.e[2], onBlur:e=>updateExField(di,flatI,2,e.target.value), style:{background:'var(--surface2)',border:'1px solid var(--line)',color:'var(--text)',borderRadius:8,padding:8,textAlign:'center'}}),
        h('button',{onClick:()=>removeExercise(di,flatI), style:{background:'transparent',color:'var(--danger)',border:'1px solid var(--line)',borderRadius:8,cursor:'pointer'}}, '×')
      )),
      h('button',{onClick:()=>addExercise(di), style:{marginTop:10,width:'100%',background:'transparent',border:'1px dashed var(--line)',color:'var(--muted)',borderRadius:12,padding:9,cursor:'pointer'}}, '+ إضافة تمرين')
    )),
    h(AF.PrimaryBtn,{onClick:addDay, style:{width:'100%',padding:18,margin:'4px 0 14px'}}, '+ إضافة يوم تمرين جديد')
  );
};
