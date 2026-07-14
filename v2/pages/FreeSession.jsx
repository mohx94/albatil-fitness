window.AF = window.AF || {};

AF.FreeSessionBuilder = function({showScreen, startFreeSession}){
  const [query, setQuery] = React.useState('');
  const [list, setList] = React.useState([]); // {name, muscle, equipment, sets, reps, custom}
  const [pendingCustomMuscle, setPendingCustomMuscle] = React.useState('');

  const result = React.useMemo(()=>query.trim() ? AF.matchExercise(query) : {match:null,candidates:[],confidence:0,equipmentHint:null}, [query]);

  const addEntry = (entry)=>{
    setList(prev=>{
      if(prev.some(p=>p.name===entry.name)) return prev;
      return [...prev, {name:entry.name, muscle:entry.muscle, equipment:entry.equipment, sets:3, reps:'8-12', custom:!!entry.custom}];
    });
    setQuery(''); setPendingCustomMuscle('');
  };

  const addCustom = ()=>{
    if(!query.trim()) return;
    if(!pendingCustomMuscle){ setPendingCustomMuscle('__ask__'); return; }
    addEntry({name:query.trim(), muscle:pendingCustomMuscle, equipment: result.equipmentHint || 'جهاز', custom:true});
  };

  const removeEntry = (name)=> setList(prev=>prev.filter(p=>p.name!==name));
  const updateEntry = (name, field, val)=> setList(prev=>prev.map(p=>p.name===name?{...p,[field]:val}:p));

  const muscles = ['الصدر','الظهر','الكتف','الباي','التراي','الأرجل','الأرداف','البطن','السواعد','كارديو'];

  return h(React.Fragment, null,
    h('div',{style:{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}},
      h(AF.GhostBtn,{onClick:()=>showScreen('workouts')},'رجوع'),
      h('div',null, h('p',{style:{color:'var(--muted)',margin:0}},'اكتب اسم أي تمرين والمدرب الذكي يتعرف عليه'), h('h2',{style:{margin:0}},'🆕 ابدأ من الصفر')),
      h('div',null)
    ),

    h(AF.Panel,null,
      h('input',{
        value:query, onChange:e=>{setQuery(e.target.value); setPendingCustomMuscle('');},
        placeholder:'مثال: عقلة على الجهاز، بنش، سكوات...',
        style:{width:'100%',padding:'14px 16px',borderRadius:14,border:'1px solid var(--line)',background:'var(--surface2)',color:'var(--text)',fontSize:15}
      }),

      query.trim() ? h('div',{style:{marginTop:12}},
        result.match ? h('div',{style:{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,background:'var(--surface2)',border:'1px solid var(--accent)',borderRadius:14,padding:'12px 14px'}},
          h('div',null,
            h('b',{style:{display:'block'}}, `✅ ${result.match.name}`),
            h('small',{style:{color:'var(--muted)'}}, `${result.match.muscle} · ${result.match.equipment}${result.confidence<1?' · تخمين تقريبي':''}`)
          ),
          h(AF.PrimaryBtn,{onClick:()=>addEntry(result.match)}, 'إضافة')
        ) : h('div',{style:{background:'var(--surface2)',border:'1px solid var(--line)',borderRadius:14,padding:'12px 14px'}},
          h('b',{style:{display:'block',marginBottom:6}}, '🤔 ما تعرّفت على هذا التمرين بثقة'),
          result.candidates.length ? h('div',{style:{display:'flex',flexWrap:'wrap',gap:8,marginBottom:10}},
            result.candidates.map(c=>h('button',{key:c.name, onClick:()=>addEntry(c), style:{fontSize:12,border:'1px solid var(--line)',background:'var(--surface)',color:'var(--text)',borderRadius:99,padding:'6px 12px',cursor:'pointer'}}, `${c.name} (${c.muscle})`))
          ) : null,
          pendingCustomMuscle==='__ask__' ? h('div',null,
            h('small',{style:{color:'var(--muted)',display:'block',marginBottom:6}},'أي عضلة يستهدف هذا التمرين؟'),
            h('div',{style:{display:'flex',flexWrap:'wrap',gap:6,marginBottom:10}},
              muscles.map(m=>h('button',{key:m, onClick:()=>addEntry({name:query.trim(), muscle:m, equipment:result.equipmentHint||'جهاز', custom:true}), style:{fontSize:12,border:'1px solid var(--line)',background:'var(--surface)',color:'var(--text)',borderRadius:99,padding:'6px 12px',cursor:'pointer'}}, m))
            )
          ) : h(AF.SecondaryBtn,{onClick:addCustom}, `➕ أضفه كتمرين مخصص باسم "${query.trim()}"`)
        )
      ) : null
    ),

    list.length ? h(AF.Panel,null,
      h(AF.SectionTitle,{title:'تمارين حصتك', right:list.length+' تمرين'}),
      h('div',{style:{display:'grid',gap:10,marginTop:6}},
        list.map(it=>h('div',{key:it.name, style:{background:'var(--surface2)',border:'1px solid var(--line)',borderRadius:14,padding:'12px 14px'}},
          h('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}},
            h('div',null, h('b',null,it.name), h('br'), h('small',{style:{color:'var(--muted)'}}, `${it.muscle} · ${it.equipment}`)),
            h('button',{onClick:()=>removeEntry(it.name), style:{border:0,background:'transparent',color:'var(--danger)',cursor:'pointer',fontSize:18}}, '✕')
          ),
          h('div',{style:{display:'flex',gap:8}},
            h('label',{style:{flex:1,fontSize:11,color:'var(--muted)'}}, 'مجموعات', h('input',{type:'number',min:1,max:8,value:it.sets,onChange:e=>updateEntry(it.name,'sets',+e.target.value||1),style:{width:'100%',marginTop:4,padding:8,borderRadius:8,border:'1px solid var(--line)',background:'var(--surface)',color:'var(--text)'}})),
            h('label',{style:{flex:1,fontSize:11,color:'var(--muted)'}}, 'التكرارات', h('input',{value:it.reps,onChange:e=>updateEntry(it.name,'reps',e.target.value),style:{width:'100%',marginTop:4,padding:8,borderRadius:8,border:'1px solid var(--line)',background:'var(--surface)',color:'var(--text)'}}))
          )
        ))
      ),
      h(AF.PrimaryBtn,{onClick:()=>startFreeSession(list), style:{width:'100%',marginTop:14}}, '🔥 ابدأ الحصة الآن')
    ) : h('p',{style:{color:'var(--muted)',fontSize:13,textAlign:'center',marginTop:20}}, 'ابحث عن أول تمرين وأضفه للبدء')
  );
};
