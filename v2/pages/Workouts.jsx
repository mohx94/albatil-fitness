window.AF = window.AF || {};

AF.WorkoutsPage = function({cur, getWorkouts, openWorkout, showScreen, advanceProgramWeek}){
  const c = cur();
  const workouts = getWorkouts();
  const week = c.mesocycle?.week||1;
  const deload = week===4;
  const recovery = AF.computeRecoveryScore(c);
  const recColor = recovery.score>=80?'var(--good)':(recovery.score>=50?'var(--gold)':'var(--danger)');

  return h(React.Fragment, null,
    h('div',{style:{display:'flex',alignItems:'flex-end',justifyContent:'space-between',margin:'14px 0 18px'}},
      h('div',null, h('p',{style:{color:'var(--muted)',margin:0}},'3 أيام رسمية + يوم اختياري'), h('h2',{style:{margin:0}},'جدول التمارين')),
    ),
    h(AF.Panel,{style:{display:'flex',alignItems:'center',gap:14}},
      h(AF.RingChart,{percent:recovery.score, label:recovery.score, sub:'%', size:64, color:recColor}),
      h('div',{style:{flex:1}},
        h('span',{style:{display:'block',color:'var(--muted)',fontSize:12,marginBottom:2}},'Recovery — جاهزيتك اليوم'),
        h('b',{style:{fontSize:13}}, recovery.note)
      )
    ),
    h('div',{style:{display:'flex',gap:8,marginBottom:14,marginTop:14}},
      h(AF.SecondaryBtn,{onClick:()=>showScreen('library'), style:{flex:1}}, '📚 مكتبة التمارين'),
      h(AF.SecondaryBtn,{onClick:()=>showScreen('freeSession'), style:{flex:1}}, '🆕 ابدأ من الصفر'),
      h(AF.SecondaryBtn,{onClick:()=>showScreen('editSchedule'), style:{flex:1}}, '✏️ تخصيص الجدول')
    ),
    h(AF.Panel,{style:{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}},
      h('div',null,
        h('h3',{style:{fontSize:14,margin:0}}, '🗓️ دورة التدريج التلقائي'),
        h('span',{style:{color:'var(--muted)',fontSize:13}}, `أسبوع ${week} من 4${deload?' · تخفيف (Deload)':' · تدريج تلقائي'}`)
      ),
      h(AF.SecondaryBtn,{onClick:advanceProgramWeek}, 'الأسبوع الجاي ›')
    ),
    h('div',{style:{display:'grid',gap:12,marginTop:14}},
      workouts.map((w,i)=>{
        const exCount = w.groups.reduce((a,[,exs])=>a+exs.length,0);
        return h('button',{key:w.id, onClick:()=>openWorkout(w.id), style:{
          background:'var(--surface)',border:'1px solid var(--line)',borderRadius:20,padding:18,
          display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,color:'var(--text)',
          textAlign:'right',cursor:'pointer',width:'100%'
        }},
          h('div',null, h('h3',{style:{margin:'0 0 4px'}}, w.name), h('p',{style:{margin:0,color:'var(--muted)',fontSize:13}}, `${w.subtitle} · ${exCount} تمارين`)),
          h('div',{style:{width:52,height:52,borderRadius:16,background:'rgba(var(--accent-rgb),.1)',color:'var(--accent)',display:'grid',placeItems:'center',fontWeight:900}}, i+1)
        );
      })
    )
  );
};
