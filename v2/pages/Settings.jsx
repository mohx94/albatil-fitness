window.AF = window.AF || {};

AF.SettingsPage = function({state, cur, mutate, setState, toast, cloudUser, cloudReason, theme, setTheme, notifEnabled, setNotifEnabled}){
  const c = cur();
  const [settingsForm, setSettingsForm] = React.useState({
    name:c.name, weight:c.profile.weight, goal:c.profile.goal, fat:c.profile.fat,
    height:c.profile.height||'', age:c.profile.age||'', gender:c.profile.gender||'male', activity:c.profile.activity||1.55
  });
  const [targets, setTargets] = React.useState(c.nutrition.targets);
  const today = AF.dateKey(new Date());
  const tb = c.dailyLog?.[today] || c.dailyBurn?.[today] || {sleep:'',steps:0,burn:0};
  const [burnForm, setBurnForm] = React.useState({sleep:tb.sleep||'', steps:tb.steps||'', burn:tb.burn||''});
  const fileRef = React.useRef(null);
  const [injuryForm, setInjuryForm] = React.useState({part:'الظهر', pain:3, note:''});
  const [goalsForm, setGoalsForm] = React.useState(c.weeklyGoals || {workouts:3, proteinDays:7, weightLossKg:0.5, steps:60000});
  const muscleGroups = Array.from(new Set(AF.WORKOUTS.flatMap(w=>w.groups.map(([g])=>g))));
  const qrBoxRef = React.useRef(null);
  const [qrScanning, setQrScanning] = React.useState(false);
  const qrVideoRef = React.useRef(null);
  const qrStreamRef = React.useRef(null);

  const saveSettings = (e)=>{
    e.preventDefault();
    mutate((next,p)=>{
      p.name = settingsForm.name||'محمد';
      p.profile = {weight:+settingsForm.weight||80.5, goal:+settingsForm.goal||75, fat:+settingsForm.fat||27.2,
        height:+settingsForm.height||175, age:+settingsForm.age||25, gender:settingsForm.gender, activity:+settingsForm.activity};
    });
    toast('تم حفظ الإعدادات');
  };

  const calcAutoTargets = ()=>{
    const bf = c.measurements.length ? +c.measurements[c.measurements.length-1].fat || null : null;
    const calc = AF.calcTargets({...c.profile, weight:+settingsForm.weight||c.profile.weight, goal:+settingsForm.goal||c.profile.goal, bodyFatPercent:bf||undefined});
    if(!calc){ toast('أدخل الطول والعمر أولًا'); return; }
    setTargets(calc);
    toast(bf ? `تم الاحتساب بمعادلة Katch-McArdle (دهون ${bf}%) — راجع وحفظ` : 'تم احتساب الأهداف — راجعها واحفظ');
  };
  const saveTargets = (e)=>{
    e.preventDefault();
    mutate((next,p)=>{ p.nutrition.targets = {
      calories:+targets.calories||2200, protein:+targets.protein||150, carb:+targets.carb||220, fat:+targets.fat||70
    };});
    toast('تم حفظ أهداف التغذية');
  };

  const saveBurn = ()=>{
    mutate((next,p)=>{
      if(!p.dailyLog) p.dailyLog={};
      p.dailyLog[today] = {sleep:+burnForm.sleep||null, steps:+burnForm.steps||0, burn:+burnForm.burn||0};
    });
    toast('تم الحفظ');
  };

  const addInjury = ()=>{
    mutate((next,p)=>{
      if(!p.injuries) p.injuries=[];
      p.injuries.push({id:'inj_'+Date.now(), part:injuryForm.part, pain:+injuryForm.pain, note:injuryForm.note.trim(), date:new Date().toISOString()});
    });
    setInjuryForm({part:'الظهر', pain:3, note:''});
    toast('تم تسجيل الإصابة');
  };
  const removeInjury = (id)=>mutate((next,p)=>{ p.injuries = (p.injuries||[]).filter(i=>i.id!==id); });

  const saveGoals = ()=>{
    mutate((next,p)=>{ p.weeklyGoals = {
      workouts:+goalsForm.workouts||3, proteinDays:+goalsForm.proteinDays||7,
      weightLossKg:+goalsForm.weightLossKg||0.5, steps:+goalsForm.steps||60000
    };});
    toast('تم حفظ الأهداف الأسبوعية');
  };

  const switchProfile = (id)=>{
    setState(prev=>{ const next={...prev, activeProfile:id}; AF.saveState(next); return next; });
    toast('تم تبديل الملف الشخصي');
  };
  const deleteProfile = (id)=>{
    if(!confirm('حذف هذا الملف الشخصي نهائيًا؟')) return;
    setState(prev=>{
      const profiles = {...prev.profiles}; delete profiles[id];
      const activeProfile = prev.activeProfile===id ? Object.keys(profiles)[0] : prev.activeProfile;
      const next = {...prev, profiles, activeProfile}; AF.saveState(next); return next;
    });
    toast('تم حذف الملف');
  };
  const addProfile = ()=>{
    const name = prompt('اسم الملف الشخصي الجديد؟');
    if(!name) return;
    const id = 'p'+Date.now();
    setState(prev=>{
      const profiles = {...prev.profiles, [id]:AF.blankProfileData()};
      profiles[id].name = name;
      const next = {...prev, profiles, activeProfile:id}; AF.saveState(next); return next;
    });
    toast('تم إنشاء الملف الشخصي');
  };

  const doExport = ()=>{
    const blob = new Blob([JSON.stringify(state,null,2)],{type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download='albatil-fitness-backup.json'; a.click();
    URL.revokeObjectURL(a.href);
  };
  const doImport = async (e)=>{
    try{
      const parsed = JSON.parse(await e.target.files[0].text());
      const next = parsed.profiles ? parsed : {activeProfile:'p1', profiles:{p1:parsed}};
      const check = AF.validateState(next);
      if(!check.ok){
        toast('ملف غير صالح: '+check.errors[0]);
        return;
      }
      // auto-backup current data before overwriting, in case the import turns out wrong
      localStorage.setItem('albatil-fitness-v2-app-backup-'+Date.now(), JSON.stringify(state));
      setState(next); AF.saveState(next);
      toast('تم استيراد البيانات (نسخة احتياطية من بياناتك القديمة محفوظة تلقائيًا)');
    }catch{ toast('ملف غير صالح'); }
  };

  const shareTrainer = ()=>{    const last5 = c.history.slice(-5).reverse();
    const prs = Object.entries(c.prs).slice(0,10);
    const html = `<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><title>تقرير ${c.name}</title>
    <body style="font-family:Tajawal,system-ui,sans-serif;background:#0a0f14;color:#f2f5f9;padding:24px;max-width:640px;margin:auto">
    <h1>تقرير تقدم — ${c.name}</h1>
    <p>الوزن الحالي: ${c.profile.weight} كجم · الهدف: ${c.profile.goal} كجم · نسبة الدهون: ${c.profile.fat}%</p>
    <p>عدد التمارين الكلي: ${c.history.length} · الالتزام الحالي: ${AF.computeStreak(c.history)} يوم</p>
    <h2>آخر الحصص</h2>
    <ul>${last5.map(hh=>`<li>${new Date(hh.date).toLocaleDateString('ar-SA')} — ${hh.name} — ${hh.sets} جولة — حجم ${Math.round(hh.volume)} كجم</li>`).join('')||'<li>لا يوجد بعد</li>'}</ul>
    <h2>أفضل الأرقام (PR)</h2>
    <ul>${prs.map(([k,v])=>`<li>${k.split('__')[1]}: ${v.weight} × ${v.reps}</li>`).join('')||'<li>لا يوجد بعد</li>'}</ul>
    <p style="color:#8b96ad;font-size:12px">تم إنشاؤه من تطبيق Albatil Fitness بتاريخ ${new Date().toLocaleDateString('ar-SA')}</p>
    </body></html>`;
    const blob = new Blob([html],{type:'text/html'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `albatil-report-${today}.html`; a.click();
    URL.revokeObjectURL(a.href);
    toast('تم تصدير الملخص 📤');
  };

  const requestNotif = async ()=>{
    if(!('Notification' in window)){ toast('الإشعارات غير مدعومة بهذا المتصفح'); return; }
    const perm = await Notification.requestPermission();
    setNotifEnabled(perm==='granted');
    toast(perm==='granted' ? 'تم تفعيل الإشعارات 🔔' : 'تم رفض الإذن');
  };

  function loadScriptOnce(src){
    return new Promise((res,rej)=>{
      if(document.querySelector(`script[data-src="${src}"]`)){ res(); return; }
      const s=document.createElement('script'); s.src=src; s.dataset.src=src; s.onload=res; s.onerror=rej;
      document.head.appendChild(s);
    });
  }

  const buildShareBundle = ()=>({
    v:1, name:c.name, profile:c.profile, nutritionTargets:c.nutrition.targets,
    weeklyGoals:c.weeklyGoals, customWorkouts:c.customWorkouts
  });

  const generateQR = async ()=>{
    try{
      await loadScriptOnce('https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js');
      const data = JSON.stringify(buildShareBundle());
      const qr = qrcode(0, 'L');
      qr.addData(data);
      qr.make();
      qrBoxRef.current.innerHTML = qr.createSvgTag({cellSize:4, margin:2});
      toast('📱 امسح هذا الرمز من جهاز ثانٍ لنقل الجدول والأهداف');
    }catch{ toast('تعذر إنشاء الرمز'); }
  };

  const stopQrScan = ()=>{
    qrStreamRef.current?.getTracks().forEach(tr=>tr.stop());
    qrStreamRef.current = null;
    setQrScanning(false);
  };
  const toggleQrScan = async ()=>{
    if(qrScanning){ stopQrScan(); return; }
    if(!('BarcodeDetector' in window)){ toast('المسح غير مدعوم بهذا المتصفح'); return; }
    try{
      setQrScanning(true);
      const stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}}});
      qrStreamRef.current = stream;
      qrVideoRef.current.srcObject = stream;
      await qrVideoRef.current.play();
      const detector = new BarcodeDetector({formats:['qr_code']});
      const loop = async ()=>{
        if(!qrStreamRef.current) return;
        try{
          const codes = await detector.detect(qrVideoRef.current);
          if(codes.length){
            const parsed = JSON.parse(codes[0].rawValue);
            if(parsed && parsed.v===1){
              mutate((next,p)=>{
                p.name = parsed.name || p.name;
                p.profile = {...p.profile, ...parsed.profile};
                p.nutrition.targets = parsed.nutritionTargets || p.nutrition.targets;
                p.weeklyGoals = parsed.weeklyGoals || p.weeklyGoals;
                if(parsed.customWorkouts) p.customWorkouts = parsed.customWorkouts;
              });
              toast('✅ تم استيراد الإعدادات من الرمز');
              stopQrScan();
              return;
            }
          }
        }catch{}
        requestAnimationFrame(loop);
      };
      loop();
    }catch{ toast('تعذر الوصول للكاميرا'); setQrScanning(false); }
  };

  return h(React.Fragment, null,
    h('div',{style:{margin:'14px 0 18px'}}, h('p',{style:{color:'var(--muted)',margin:0}},'بياناتك داخل جهازك (ومزامنة سحابية اختيارية)'), h('h2',{style:{margin:0}},'الإعدادات')),

    h(AF.Panel,null, h(AF.SectionTitle,{title:'الملفات الشخصية', right:'تعدد المستخدمين'}),
      h('div',{style:{display:'grid',gap:8,marginTop:12}},
        Object.entries(state.profiles).map(([id,pr])=>{
          const active = id===state.activeProfile;
          return h('div',{key:id, style:{display:'flex',alignItems:'center',justifyContent:'space-between',background:'var(--surface2)',border:'1px solid '+(active?'var(--accent)':'var(--line)'),borderRadius:14,padding:'10px 14px'}},
            h('span',null, pr.name||'ملف'),
            h('div',{style:{display:'flex',gap:6}},
              !active ? h('button',{onClick:()=>switchProfile(id), style:{border:0,background:'transparent',fontSize:16,cursor:'pointer'}},'✅') : null,
              Object.keys(state.profiles).length>1 ? h('button',{onClick:()=>deleteProfile(id), style:{border:0,background:'transparent',fontSize:16,cursor:'pointer'}},'🗑') : null
            )
          );
        })
      ),
      h(AF.SecondaryBtn,{onClick:addProfile, style:{width:'100%',marginTop:12}}, '+ ملف شخصي جديد')
    ),

    h('form',{onSubmit:saveSettings, style:{background:'linear-gradient(145deg, var(--surface), var(--panel-end))',border:'1px solid var(--line)',borderRadius:22,boxShadow:'var(--shadow)',padding:18,marginTop:14,display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}},
      h('label',{style:{fontSize:12,color:'var(--muted)'}},'اسمك', h('input',{value:settingsForm.name, onChange:e=>setSettingsForm(f=>({...f,name:e.target.value})), style:{width:'100%',marginTop:6,background:'var(--surface2)',border:'1px solid var(--line)',borderRadius:12,color:'var(--text)',padding:12}})),
      h('label',{style:{fontSize:12,color:'var(--muted)'}},'الوزن الحالي', h('input',{type:'number', step:'0.1', value:settingsForm.weight, onChange:e=>setSettingsForm(f=>({...f,weight:e.target.value})), style:{width:'100%',marginTop:6,background:'var(--surface2)',border:'1px solid var(--line)',borderRadius:12,color:'var(--text)',padding:12}})),
      h('label',{style:{fontSize:12,color:'var(--muted)'}},'وزن الهدف', h('input',{type:'number', step:'0.1', value:settingsForm.goal, onChange:e=>setSettingsForm(f=>({...f,goal:e.target.value})), style:{width:'100%',marginTop:6,background:'var(--surface2)',border:'1px solid var(--line)',borderRadius:12,color:'var(--text)',padding:12}})),
      h('label',{style:{fontSize:12,color:'var(--muted)'}},'نسبة الدهون', h('input',{type:'number', step:'0.1', value:settingsForm.fat, onChange:e=>setSettingsForm(f=>({...f,fat:e.target.value})), style:{width:'100%',marginTop:6,background:'var(--surface2)',border:'1px solid var(--line)',borderRadius:12,color:'var(--text)',padding:12}})),
      h('label',{style:{fontSize:12,color:'var(--muted)'}},'الطول (سم)', h('input',{type:'number', step:'0.1', value:settingsForm.height, onChange:e=>setSettingsForm(f=>({...f,height:e.target.value})), style:{width:'100%',marginTop:6,background:'var(--surface2)',border:'1px solid var(--line)',borderRadius:12,color:'var(--text)',padding:12}})),
      h('label',{style:{fontSize:12,color:'var(--muted)'}},'العمر', h('input',{type:'number', value:settingsForm.age, onChange:e=>setSettingsForm(f=>({...f,age:e.target.value})), style:{width:'100%',marginTop:6,background:'var(--surface2)',border:'1px solid var(--line)',borderRadius:12,color:'var(--text)',padding:12}})),
      h('label',{style:{fontSize:12,color:'var(--muted)'}},'الجنس', h('select',{value:settingsForm.gender, onChange:e=>setSettingsForm(f=>({...f,gender:e.target.value})), style:{width:'100%',marginTop:6,background:'var(--surface2)',border:'1px solid var(--line)',borderRadius:12,color:'var(--text)',padding:12}}, h('option',{value:'male'},'ذكر'), h('option',{value:'female'},'أنثى'))),
      h('label',{style:{fontSize:12,color:'var(--muted)'}},'مستوى النشاط', h('select',{value:settingsForm.activity, onChange:e=>setSettingsForm(f=>({...f,activity:e.target.value})), style:{width:'100%',marginTop:6,background:'var(--surface2)',border:'1px solid var(--line)',borderRadius:12,color:'var(--text)',padding:12}},
        h('option',{value:1.2},'قليل الحركة'), h('option',{value:1.375},'نشاط خفيف'), h('option',{value:1.55},'نشاط متوسط'), h('option',{value:1.725},'نشاط عالي'))),
      h(AF.PrimaryBtn,{type:'submit', style:{gridColumn:'1/-1'}}, 'حفظ الإعدادات')
    ),

    h(AF.Panel,null, h(AF.SectionTitle,{title:'أهداف التغذية اليومية'}),
      h(AF.SecondaryBtn,{onClick:calcAutoTargets, style:{width:'100%',marginBottom:12}}, '🧮 احسب الأهداف تلقائيًا من بياناتي'),
      h('form',{onSubmit:saveTargets, style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}},
        [['calories','السعرات'],['protein','بروتين (جم)'],['carb','كارب (جم)'],['fat','دهون (جم)']].map(([f,label])=>
          h('label',{key:f, style:{fontSize:12,color:'var(--muted)'}}, label,
            h('input',{type:'number', value:targets[f], onChange:e=>setTargets(t=>({...t,[f]:e.target.value})), style:{width:'100%',marginTop:6,background:'var(--surface2)',border:'1px solid var(--line)',borderRadius:12,color:'var(--text)',padding:12}}))
        ),
        h(AF.PrimaryBtn,{type:'submit', style:{gridColumn:'1/-1'}}, 'حفظ الأهداف')
      )
    ),

    h(AF.Panel,null, h(AF.SectionTitle,{title:'المظهر'}),
      h(AF.SecondaryBtn,{onClick:()=>setTheme(theme==='light'?'dark':'light'), style:{width:'100%'}}, '🌗 تبديل الوضع (داكن/فاتح)')
    ),

    h(AF.Panel,null, h(AF.SectionTitle,{title:'خطوات النشاط اليومية', right:'يدويًا'}),
      h('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}},
        h('label',{style:{fontSize:12,color:'var(--muted)'}},'ساعات النوم', h('input',{type:'number', step:'0.5', value:burnForm.sleep, onChange:e=>setBurnForm(f=>({...f,sleep:e.target.value})), placeholder:'0', style:{width:'100%',marginTop:6,background:'var(--surface2)',border:'1px solid var(--line)',borderRadius:12,color:'var(--text)',padding:12}})),
        h('label',{style:{fontSize:12,color:'var(--muted)'}},'الخطوات', h('input',{type:'number', value:burnForm.steps, onChange:e=>setBurnForm(f=>({...f,steps:e.target.value})), placeholder:'0', style:{width:'100%',marginTop:6,background:'var(--surface2)',border:'1px solid var(--line)',borderRadius:12,color:'var(--text)',padding:12}})),
        h('label',{style:{fontSize:12,color:'var(--muted)'}},'سعرات محروقة إضافية', h('input',{type:'number', value:burnForm.burn, onChange:e=>setBurnForm(f=>({...f,burn:e.target.value})), placeholder:'0', style:{width:'100%',marginTop:6,background:'var(--surface2)',border:'1px solid var(--line)',borderRadius:12,color:'var(--text)',padding:12}}))
      ),
      h(AF.SecondaryBtn,{onClick:saveBurn, style:{width:'100%',marginTop:10}}, 'حفظ'),
      h('div',{style:{fontSize:12,color:'var(--muted)',background:'var(--surface2)',border:'1px dashed var(--line)',borderRadius:12,padding:12,marginTop:12}},
        '⚠️ مزامنة تلقائية حقيقية مع Huawei Health / Google Fit / Apple Health مو ممكنة من تطبيق ويب عادي — تتطلب تطبيق جوّال أصلي (Native) مرتبط بحسابها رسميًا. لحين ذاك انسخ الخطوات/السعرات المحروقة يدويًا وبنضيفها لميزانية سعراتك.'
      )
    ),

    h(AF.Panel,null, h(AF.SectionTitle,{title:'الإصابات', right:'يمنع اقتراح تمارين العضلة المصابة'}),
      h('div',{style:{display:'grid',gap:8,marginBottom:12}},
        (c.injuries||[]).length ? (c.injuries||[]).map(inj=>h('div',{key:inj.id, style:{display:'flex',justifyContent:'space-between',alignItems:'center',background:'var(--surface2)',border:'1px solid var(--line)',borderRadius:14,padding:12}},
          h('div',null, h('b',null, inj.part), h('small',{style:{color:'var(--muted)',marginRight:8}}, `ألم ${inj.pain}/5${inj.note?' · '+inj.note:''}`)),
          h('button',{onClick:()=>removeInjury(inj.id), style:{border:0,background:'transparent',color:'var(--danger)',cursor:'pointer',fontSize:16}}, '🗑')
        )) : h('div',{style:{color:'var(--muted)',fontSize:13}}, 'لا توجد إصابات مسجلة')
      ),
      h('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}},
        h('label',{style:{fontSize:12,color:'var(--muted)'}},'العضلة/المنطقة', h('select',{value:injuryForm.part, onChange:e=>setInjuryForm(f=>({...f,part:e.target.value})), style:{width:'100%',marginTop:6,background:'var(--surface2)',border:'1px solid var(--line)',borderRadius:12,color:'var(--text)',padding:12}}, muscleGroups.map(g=>h('option',{key:g,value:g},g)))),
        h('label',{style:{fontSize:12,color:'var(--muted)'}},`درجة الألم: ${injuryForm.pain}/5`, h('input',{type:'range', min:1, max:5, value:injuryForm.pain, onChange:e=>setInjuryForm(f=>({...f,pain:+e.target.value})), style:{width:'100%',marginTop:12}})),
        h('label',{style:{fontSize:12,color:'var(--muted)',gridColumn:'1/-1'}},'ملاحظة (اختياري)', h('input',{value:injuryForm.note, onChange:e=>setInjuryForm(f=>({...f,note:e.target.value})), style:{width:'100%',marginTop:6,background:'var(--surface2)',border:'1px solid var(--line)',borderRadius:12,color:'var(--text)',padding:12}}))
      ),
      h(AF.SecondaryBtn,{onClick:addInjury, style:{width:'100%',marginTop:10}}, '+ تسجيل إصابة')
    ),

    h(AF.Panel,null, h(AF.SectionTitle,{title:'الأهداف الأسبوعية'}),
      h('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}},
        h('label',{style:{fontSize:12,color:'var(--muted)'}},'عدد التمارين', h('input',{type:'number', value:goalsForm.workouts, onChange:e=>setGoalsForm(f=>({...f,workouts:e.target.value})), style:{width:'100%',marginTop:6,background:'var(--surface2)',border:'1px solid var(--line)',borderRadius:12,color:'var(--text)',padding:12}})),
        h('label',{style:{fontSize:12,color:'var(--muted)'}},'أيام تحقيق هدف البروتين', h('input',{type:'number', value:goalsForm.proteinDays, onChange:e=>setGoalsForm(f=>({...f,proteinDays:e.target.value})), style:{width:'100%',marginTop:6,background:'var(--surface2)',border:'1px solid var(--line)',borderRadius:12,color:'var(--text)',padding:12}})),
        h('label',{style:{fontSize:12,color:'var(--muted)'}},'هدف نزول الوزن (كجم)', h('input',{type:'number', step:'0.1', value:goalsForm.weightLossKg, onChange:e=>setGoalsForm(f=>({...f,weightLossKg:e.target.value})), style:{width:'100%',marginTop:6,background:'var(--surface2)',border:'1px solid var(--line)',borderRadius:12,color:'var(--text)',padding:12}})),
        h('label',{style:{fontSize:12,color:'var(--muted)'}},'هدف الخطوات', h('input',{type:'number', value:goalsForm.steps, onChange:e=>setGoalsForm(f=>({...f,steps:e.target.value})), style:{width:'100%',marginTop:6,background:'var(--surface2)',border:'1px solid var(--line)',borderRadius:12,color:'var(--text)',padding:12}}))
      ),
      h(AF.SecondaryBtn,{onClick:saveGoals, style:{width:'100%',marginTop:10}}, 'حفظ الأهداف الأسبوعية')
    ),

    h(AF.Panel,null, h(AF.SectionTitle,{title:'مشاركة سريعة عبر QR', right:'الجدول والأهداف فقط'}),
      h(AF.SecondaryBtn,{onClick:generateQR, style:{width:'100%',marginBottom:10}}, '📱 إنشاء رمز QR'),
      h('div',{ref:qrBoxRef, style:{display:'flex',justifyContent:'center',margin:'10px 0'}}),
      h(AF.SecondaryBtn,{onClick:toggleQrScan, style:{width:'100%'}}, qrScanning?'⏹️ إيقاف المسح':'📷 مسح رمز QR من جهاز آخر'),
      h('video',{ref:qrVideoRef, muted:true, playsInline:true, autoPlay:true, style:{display:qrScanning?'block':'none',width:'100%',borderRadius:14,marginTop:10,background:'#000'}}),
      h('div',{style:{fontSize:12,color:'var(--muted)',background:'var(--surface2)',border:'1px dashed var(--line)',borderRadius:12,padding:12,marginTop:12}},
        'ينقل فقط: اسمك، بياناتك الأساسية، جدول التمارين المخصص، وأهدافك — بدون سجل التمارين أو التغذية (كبير على QR). لنقل كل شيء استخدم التصدير/الاستيراد أو المزامنة السحابية.'
      )
    ),

    h(AF.Panel,null, h(AF.SectionTitle,{title:'مشاركة مع المدرّب'}),
      h(AF.SecondaryBtn,{onClick:shareTrainer, style:{width:'100%'}}, '📤 تصدير ملخص تقدم (HTML)')
    ),

    h(AF.Panel,null, h(AF.SectionTitle,{title:'الإشعارات'}),
      h(AF.SecondaryBtn,{onClick:requestNotif, style:{width:'100%'}}, '🔔 تفعيل تنبيه انتهاء الراحة')
    ),

    h(AF.Panel,null, h(AF.SectionTitle,{title:'المزامنة السحابية', right: cloudUser ? `متصل: ${cloudUser.displayName||cloudUser.email}` : (cloudReason==='no-config' ? '🔧 غير مُعد' : 'غير متصل')}),
      cloudUser && state.updatedAt ? h('div',{style:{fontSize:12,color:'var(--muted)',marginBottom:10}}, `آخر تحديث محلي: ${new Date(state.updatedAt).toLocaleString('ar-SA')} — يتزامن تلقائيًا`) : null,
      h(AF.SecondaryBtn,{onClick:()=>cloudUser?AF.cloudSignOut():AF.cloudSignIn().catch(()=>toast('تعذر تسجيل الدخول')), style:{width:'100%',marginBottom:10}}, cloudUser?'تسجيل الخروج':'تسجيل الدخول بجوجل'),
      cloudUser ? h('div',{style:{display:'flex',gap:10,flexWrap:'wrap'}},
        h(AF.SecondaryBtn,{onClick:()=>AF.cloudPush(state).then(()=>toast('تم رفع بياناتك ☁️')).catch(()=>toast('تعذر الرفع'))}, '⬆️ رفع بياناتي للسحابة'),
        h(AF.SecondaryBtn,{onClick:()=>{
          if(!confirm('هذا راح يستبدل بياناتك الحالية بالنسخة السحابية، متأكد؟')) return;
          AF.cloudPull().then(remote=>{ if(remote){ setState(remote); AF.saveState(remote); toast('تم سحب بياناتك ☁️'); } else toast('لا توجد بيانات محفوظة بعد'); }).catch(()=>toast('تعذر السحب'));
        }}, '⬇️ سحب بياناتي من السحابة')
      ) : null,
      h('div',{style:{fontSize:12,color:'var(--muted)',background:'var(--surface2)',border:'1px dashed var(--line)',borderRadius:12,padding:12,marginTop:12}},
        'لتفعيل هذه الخاصية أنشئ مشروع Firebase مجاني وانسخ مفاتيحه بملف firebase-config.js — التفاصيل بملف README.'
      )
    ),

    h(AF.Panel,null, h(AF.SectionTitle,{title:'النسخة الاحتياطية'}),
      h('div',{style:{display:'flex',gap:10,flexWrap:'wrap'}},
        h(AF.SecondaryBtn,{onClick:doExport}, 'تصدير البيانات'),
        h('label',{style:{border:'1px solid var(--line)',borderRadius:14,padding:'13px 16px',fontWeight:800,background:'var(--surface2)',color:'var(--text)',cursor:'pointer',display:'inline-flex',alignItems:'center'}},
          'استيراد', h('input',{type:'file', accept:'application/json', ref:fileRef, onChange:doImport, hidden:true}))
      )
    )
  );
};
