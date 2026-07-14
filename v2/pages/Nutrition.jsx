window.AF = window.AF || {};

AF.NutritionPage = function({cur, mutate, toast}){
  const c = cur();
  const [nutriDate, setNutriDate] = React.useState(new Date());
  const [foodId, setFoodId] = React.useState(AF.FOODS[0].id);
  const [qty, setQty] = React.useState(100);
  const [barcode, setBarcode] = React.useState('');
  const [scanning, setScanning] = React.useState(false);
  const [scanStatus, setScanStatus] = React.useState('');
  const videoRef = React.useRef(null);
  const streamRef = React.useRef(null);
  const rafRef = React.useRef(null);
  const [newFood, setNewFood] = React.useState({name:'',barcode:'',cal:'',protein:'',carb:'',fat:''});
  const [editingIdx, setEditingIdx] = React.useState(null);
  const [editQty, setEditQty] = React.useState('');

  const allFoods = () => AF.FOODS.concat(AF.EXTERNAL_FOODS||[]).concat(c.nutrition.customFoods);
  const findFood = (id) => allFoods().find(f=>f.id===id);
  const [foodQuery, setFoodQuery] = React.useState(AF.FOODS[0].name);
  const [foodListOpen, setFoodListOpen] = React.useState(false);
  const filteredFoods = React.useMemo(()=>{
    const q = foodQuery.trim();
    if(!q) return allFoods().slice(0,30);
    return allFoods().filter(f=>f.name.includes(q) || (f.aliases||[]).some(a=>a.includes(q))).slice(0,30);
  },[foodQuery, c.nutrition.customFoods]);
  const pickFood = (f)=>{ setFoodId(f.id); setFoodQuery(f.name); setFoodListOpen(false); };
  const k = AF.dateKey(nutriDate);
  const today = AF.dateKey(new Date());
  const dayLogs = c.nutrition.logs.filter(l=>l.date===k);
  const totals = dayLogs.reduce((a,l)=>({cal:a.cal+l.cal, protein:a.protein+l.protein, carb:a.carb+l.carb, fat:a.fat+l.fat}), {cal:0,protein:0,carb:0,fat:0});
  const t = c.nutrition.targets;
  const extra = c.dailyBurn?.[today]?.burn || 0;
  const calPct = Math.min(100, Math.round(totals.cal/Math.max(1,t.calories+extra)*100));

  React.useEffect(()=>{
    if(!barcode.trim()) return;
    const match = c.nutrition.customFoods.find(f=>f.barcode===barcode.trim());
    if(match){ setFoodId(match.id); toast('تم العثور على الصنف ✅'); }
  },[barcode]);

  const stopScan = ()=>{
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(tr=>tr.stop());
    streamRef.current = null;
    setScanning(false);
    setScanStatus('');
  };

  React.useEffect(()=>{
    if(!scanning) return;
    let cancelled = false;
    (async ()=>{
      if(!('BarcodeDetector' in window)){
        setScanStatus('❌ المسح بالكاميرا غير مدعوم على هذا المتصفح (يعمل على Chrome لأندرويد فقط)');
        setScanning(false);
        return;
      }
      try{
        setScanStatus('📷 جارٍ تشغيل الكاميرا...');
        const stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}}});
        if(cancelled){ stream.getTracks().forEach(tr=>tr.stop()); return; }
        streamRef.current = stream;
        const video = videoRef.current;
        video.srcObject = stream;
        await video.play();
        let detector;
        try{ detector = new BarcodeDetector(); }
        catch{ setScanStatus('❌ تعذر تشغيل قارئ الباركود'); stopScan(); return; }
        setScanStatus('🔍 جارٍ البحث عن الباركود... وجّه الكاميرا للباركود');
        const loop = async ()=>{
          if(cancelled || !streamRef.current) return;
          if(video.readyState>=2){
            try{
              const codes = await detector.detect(video);
              if(codes.length){
                setBarcode(codes[0].rawValue);
                toast('📷 تم قراءة الباركود: '+codes[0].rawValue);
                stopScan();
                return;
              }
            }catch{}
          }
          rafRef.current = requestAnimationFrame(loop);
        };
        loop();
      }catch(e){
        setScanStatus('❌ تعذر الوصول للكاميرا — تأكد إنك سمحت بالإذن من إعدادات المتصفح');
        setScanning(false);
      }
    })();
    return ()=>{ cancelled = true; };
  },[scanning]);

  React.useEffect(()=>()=>{ cancelAnimationFrame(rafRef.current); streamRef.current?.getTracks().forEach(tr=>tr.stop()); },[]);

  const toggleScan = ()=>{
    if(scanning){ stopScan(); return; }
    setScanning(true);
  };

  const addMeal = ()=>{
    const food = findFood(foodId);
    if(!food || !qty){ toast('اختر صنف وأدخل الكمية'); return; }
    const ratio = qty/100;
    mutate((next,p)=>{
      p.nutrition.logs.push({date:k, foodId, name:food.name, qty:+qty,
        cal:Math.round(food.cal*ratio), protein:+(food.protein*ratio).toFixed(1),
        carb:+(food.carb*ratio).toFixed(1), fat:+(food.fat*ratio).toFixed(1)});
    });
    toast('تمت إضافة الوجبة 🍽️');
  };

  const addQuickMeal = (meal)=>{
    mutate((next,p)=>{
      meal.items.forEach(it=>{
        const food = findFood(it.id); if(!food) return;
        const ratio = it.qty/100;
        p.nutrition.logs.push({date:k, foodId:it.id, name:food.name, qty:it.qty,
          cal:Math.round(food.cal*ratio), protein:+(food.protein*ratio).toFixed(1),
          carb:+(food.carb*ratio).toFixed(1), fat:+(food.fat*ratio).toFixed(1)});
      });
    });
    toast(`تمت إضافة ${meal.name} 🍽️`);
  };

  const deleteMeal = (idxInDay)=>{
    mutate((next,p)=>{
      let count=-1;
      p.nutrition.logs = p.nutrition.logs.filter(l=>{
        if(l.date!==k) return true;
        count++;
        return count!==idxInDay;
      });
    });
  };

  const startEdit = (idxInDay, log)=>{ setEditingIdx(idxInDay); setEditQty(log.qty); };
  const cancelEdit = ()=>{ setEditingIdx(null); setEditQty(''); };
  const saveEdit = (idxInDay)=>{
    const q = +editQty;
    if(!q){ toast('أدخل كمية صحيحة'); return; }
    mutate((next,p)=>{
      let count=-1;
      p.nutrition.logs = p.nutrition.logs.map(l=>{
        if(l.date!==k) return l;
        count++;
        if(count!==idxInDay) return l;
        const food = AF.FOODS.concat(p.nutrition.customFoods).find(f=>f.id===l.foodId);
        const ratio = q/100;
        return food ? {...l, qty:q, cal:Math.round(food.cal*ratio), protein:+(food.protein*ratio).toFixed(1), carb:+(food.carb*ratio).toFixed(1), fat:+(food.fat*ratio).toFixed(1)} : {...l, qty:q};
      });
    });
    toast('تم تعديل الوجبة ✏️');
    setEditingIdx(null); setEditQty('');
  };

  // Top 3 most-frequently logged foods over the last 10 days — quick re-add without searching.
  const frequentFoods = React.useMemo(()=>{
    const cutoff = Date.now()-10*86400000;
    const counts = {};
    c.nutrition.logs.forEach(l=>{
      if(new Date(l.date).getTime()<cutoff) return;
      if(!counts[l.foodId]) counts[l.foodId] = {foodId:l.foodId, name:l.name, qty:l.qty, count:0};
      counts[l.foodId].count++;
    });
    return Object.values(counts).sort((a,b)=>b.count-a.count).slice(0,3);
  },[c.nutrition.logs]);
  const addFrequent = (f)=>{
    const food = findFood(f.foodId); if(!food) return;
    const ratio = f.qty/100;
    mutate((next,p)=>{
      p.nutrition.logs.push({date:k, foodId:f.foodId, name:food.name, qty:f.qty,
        cal:Math.round(food.cal*ratio), protein:+(food.protein*ratio).toFixed(1),
        carb:+(food.carb*ratio).toFixed(1), fat:+(food.fat*ratio).toFixed(1)});
    });
    toast('تمت إضافة '+food.name+' 🍽️');
  };

  const addFood = ()=>{
    if(!newFood.name.trim() || !newFood.cal){ toast('أدخل الاسم والسعرات على الأقل'); return; }
    const id = 'custom_'+Date.now();
    mutate((next,p)=>{
      p.nutrition.customFoods.push({id, name:newFood.name.trim(), cal:+newFood.cal||0,
        protein:+newFood.protein||0, carb:+newFood.carb||0, fat:+newFood.fat||0, barcode:newFood.barcode.trim()||null});
    });
    setFoodId(id);
    setNewFood({name:'',barcode:'',cal:'',protein:'',carb:'',fat:''});
    toast('تم حفظ الصنف الجديد ✅');
  };

  return h(React.Fragment, null,
    h('div',{style:{margin:'14px 0 18px'}}, h('p',{style:{color:'var(--muted)',margin:0}},'تابع أكلك اليومي'), h('h2',{style:{margin:0}},'التغذية')),
    h('div',{style:{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}},
      h(AF.GhostBtn,{onClick:()=>setNutriDate(d=>{const n=new Date(d);n.setDate(n.getDate()-1);return n;})}, '‹'),
      h('h3',{style:{margin:0}}, k===today?'اليوم':nutriDate.toLocaleDateString('ar-SA',{weekday:'long',day:'numeric',month:'numeric'})),
      h(AF.GhostBtn,{onClick:()=>setNutriDate(d=>{const n=new Date(d);n.setDate(n.getDate()+1);return n;})}, '›')
    ),

    h(AF.Panel,{style:{display:'flex',alignItems:'center',gap:18}},
      h(AF.RingChart,{percent:calPct, label:Math.round(totals.cal), sub:'سعرة'}),
      h('div',{style:{flex:1,display:'grid',gap:10}},
        [['protein','بروتين','var(--accent2)'],['carb','كارب','var(--gold)'],['fat','دهون','var(--danger)']].map(([f,label,color])=>
          h('div',{key:f, style:{display:'grid',gridTemplateColumns:'52px 1fr auto',gap:8,alignItems:'center'}},
            h('span',{style:{color:'var(--muted)',fontSize:12}},label),
            h('div',{style:{height:8,borderRadius:99,background:'var(--surface2)',overflow:'hidden'}},
              h('div',{style:{height:'100%',borderRadius:99,width:Math.min(100,Math.round(totals[f]/Math.max(1,t[f])*100))+'%',background:color,transition:'width .4s ease'}})
            ),
            h('b',{style:{fontSize:11,whiteSpace:'nowrap'}}, `${Math.round(totals[f])} / ${t[f]} جم`)
          )
        )
      )
    ),

    h(AF.Panel,null, h(AF.SectionTitle,{title:'وجبات سريعة', right:'ضغطة وحدة'}),
      h('div',{style:{display:'flex',flexWrap:'wrap',gap:8,marginBottom:frequentFoods.length?14:0}},
        AF.QUICK_MEALS.map((m,i)=>h('button',{key:i, onClick:()=>addQuickMeal(m), style:{
          background:'var(--surface2)',border:'1px solid var(--line)',color:'var(--text)',borderRadius:99,
          padding:'9px 14px',fontSize:13,fontWeight:700,cursor:'pointer'
        }}, m.name))
      ),
      frequentFoods.length ? h(React.Fragment,null,
        h('small',{style:{color:'var(--muted)',display:'block',marginBottom:8}}, '⭐ الأكثر تكرارًا آخر 10 أيام'),
        h('div',{style:{display:'flex',flexWrap:'wrap',gap:8}},
          frequentFoods.map(f=>h('button',{key:f.foodId, onClick:()=>addFrequent(f), style:{
            background:'rgba(var(--accent-rgb),.08)',border:'1px solid rgba(var(--accent-rgb),.25)',color:'var(--text)',borderRadius:99,
            padding:'9px 14px',fontSize:13,fontWeight:700,cursor:'pointer'
          }}, `${f.name} (${f.qty}جم)`))
        )
      ) : null
    ),

    h(AF.Panel,null, h(AF.SectionTitle,{title:'إضافة وجبة'}),
      h('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}},
        h('label',{style:{fontSize:12,color:'var(--muted)'}},'بحث بالباركود (تجريبي)',
          h('input',{value:barcode, onChange:e=>setBarcode(e.target.value), placeholder:'ادخل رقم الباركود المحفوظ', style:{width:'100%',marginTop:6,background:'var(--surface2)',border:'1px solid var(--line)',borderRadius:12,color:'var(--text)',padding:12}})),
        h('label',{style:{fontSize:12,color:'var(--muted)',alignSelf:'end'}},
          h(AF.SecondaryBtn,{onClick:toggleScan, style:{width:'100%',marginTop:6}}, scanning?'⏹️ إيقاف المسح':'📷 مسح بالكاميرا')),
        h('label',{style:{fontSize:12,color:'var(--muted)',gridColumn:'1/-1',position:'relative'}},'الصنف',
          h('input',{
            value:foodQuery, onChange:e=>{setFoodQuery(e.target.value); setFoodListOpen(true);}, onFocus:()=>setFoodListOpen(true),
            placeholder:'ابحث بين أكثر من 1250 صنف...', autoComplete:'off',
            style:{width:'100%',marginTop:6,background:'var(--surface2)',border:'1px solid var(--line)',borderRadius:12,color:'var(--text)',padding:12}
          }),
          foodListOpen ? h('div',{style:{position:'absolute',top:'100%',right:0,left:0,zIndex:20,marginTop:4,maxHeight:260,overflowY:'auto',background:'var(--surface)',border:'1px solid var(--line)',borderRadius:12,boxShadow:'var(--shadow)'}},
            filteredFoods.length ? filteredFoods.map(f=>h('div',{key:f.id, onClick:()=>pickFood(f), style:{padding:'10px 14px',borderBottom:'1px solid var(--line)',cursor:'pointer',fontSize:13,display:'flex',justifyContent:'space-between'}},
              h('span',null,f.name), h('small',{style:{color:'var(--muted)'}}, f.cal+' سعرة')
            )) : h('div',{style:{padding:'12px 14px',fontSize:12,color:'var(--muted)'}}, 'لا نتائج')
          ) : null
        ),
        h('label',{style:{fontSize:12,color:'var(--muted)'}},'الكمية (جم)',
          h('input',{type:'number', value:qty, min:1, onChange:e=>setQty(e.target.value), style:{width:'100%',marginTop:6,background:'var(--surface2)',border:'1px solid var(--line)',borderRadius:12,color:'var(--text)',padding:12}}))
      ),
      h('video',{ref:videoRef, muted:true, playsInline:true, autoPlay:true, style:{display:scanning?'block':'none',width:'100%',borderRadius:14,marginTop:10,background:'#000'}}),
      scanStatus ? h('div',{style:{fontSize:12,color:'var(--muted)',marginTop:6}}, scanStatus) : null,
      (()=>{ const f=findFood(foodId); if(!f||!qty) return null; const r=+qty/100;
        return h('div',{style:{display:'flex',gap:14,flexWrap:'wrap',background:'var(--surface2)',border:'1px dashed var(--line)',borderRadius:12,padding:'10px 14px',marginTop:10,fontSize:12}},
          h('span',null,'🔥 ', h('b',null,Math.round(f.cal*r)), ' سعرة'),
          h('span',null,'🥩 ', h('b',null,(f.protein*r).toFixed(1)), ' جم بروتين'),
          h('span',null,'🍞 ', h('b',null,(f.carb*r).toFixed(1)), ' جم كارب'),
          h('span',null,'🧈 ', h('b',null,(f.fat*r).toFixed(1)), ' جم دهون')
        );
      })(),
      h(AF.PrimaryBtn,{onClick:addMeal, style:{width:'100%',marginTop:10}}, '+ إضافة للسجل')
    ),

    h(AF.Panel,null, h(AF.SectionTitle,{title:'سجل اليوم', right:dayLogs.length+' وجبات'}),
      h('div',{style:{display:'grid',gap:8,marginTop:12}},
        dayLogs.length ? dayLogs.map((l,i)=>
          editingIdx===i ? h('div',{key:i, style:{background:'var(--surface2)',border:'1px solid var(--accent)',borderRadius:14,padding:12}},
            h('b',{style:{display:'block',marginBottom:8}},l.name),
            h('div',{style:{display:'flex',gap:8}},
              h('input',{type:'number', value:editQty, onChange:e=>setEditQty(e.target.value), style:{flex:1,padding:10,borderRadius:10,border:'1px solid var(--line)',background:'var(--surface)',color:'var(--text)'}}),
              h(AF.PrimaryBtn,{onClick:()=>saveEdit(i)}, 'حفظ'),
              h(AF.GhostBtn,{onClick:cancelEdit}, 'إلغاء')
            )
          ) : h('div',{key:i, style:{display:'flex',justifyContent:'space-between',alignItems:'center',background:'var(--surface2)',border:'1px solid var(--line)',borderRadius:14,padding:12}},
            h('div',null, h('b',null,l.name), h('br'), h('small',{style:{color:'var(--muted)'}}, `${l.qty} جم · ${l.cal} سعرة`)),
            h('div',{style:{display:'flex',gap:6}},
              h(AF.GhostBtn,{onClick:()=>startEdit(i,l)}, 'تعديل'),
              h(AF.GhostBtn,{onClick:()=>deleteMeal(i)}, 'حذف')
            )
          )
        ) : h('div',{style:{color:'var(--muted)',fontSize:13}}, 'لا توجد وجبات مسجلة اليوم')
      )
    ),

    h(AF.Panel,null, h(AF.SectionTitle,{title:'إضافة صنف جديد لقاعدة البيانات'}),
      h('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}},
        [['name','الاسم'],['barcode','باركود (اختياري)'],['cal','سعرات/100جم'],['protein','بروتين/100جم'],['carb','كارب/100جم'],['fat','دهون/100جم']].map(([f,label])=>
          h('label',{key:f, style:{fontSize:12,color:'var(--muted)'}}, label,
            h('input',{value:newFood[f], onChange:e=>setNewFood(prev=>({...prev,[f]:e.target.value})), style:{width:'100%',marginTop:6,background:'var(--surface2)',border:'1px solid var(--line)',borderRadius:12,color:'var(--text)',padding:12}}))
        )
      ),
      h(AF.SecondaryBtn,{onClick:addFood, style:{width:'100%',marginTop:10}}, 'حفظ الصنف')
    )
  );
};
