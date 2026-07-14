window.AF = window.AF || {};

AF.guessEquipment = function(name){
  const n = name.toLowerCase();
  if(/cable|كيبل|pushdown|pulldown|face pull|fly/.test(n)) return "كيبل";
  if(/machine|press$|leg press|extension|curl machine|rear delt machine/.test(n) && !/dumbbell|ez bar/.test(n)) return "جهاز";
  if(/dumbbell|دمبل/.test(n)) return "دمبل";
  if(/bar|بار|squat|deadlift|bench/.test(n)) return "بار حر";
  if(/عقلة|سحب أرضي|سحب ذراع|wrist curl|reverse curl/.test(n)) return "جهاز";
  return "جهاز";
};

// Canonical exercise DB: each entry keyed by its home workout id (for continuity with
// the official PULL/PUSH/LEGS/optional PR + volume history), tagged with muscle + equipment.
AF.EXERCISE_DB = [];
AF.WORKOUTS.forEach(w=>w.groups.forEach(([muscle,exs])=>exs.forEach(([name])=>{
  AF.EXERCISE_DB.push({name, muscle, workoutId:w.id, equipment:AF.EQUIPMENT_OVERRIDE?.[name]||AF.guessEquipment(name)});
})));

// Extra common exercises (not in the default 3-day split) users often type free-form.
AF.EXTRA_EXERCISES = [
  {name:"Deadlift", muscle:"الظهر", equipment:"بار حر"},
  {name:"Barbell Row", muscle:"الظهر", equipment:"بار حر"},
  {name:"Lat Pulldown", muscle:"الظهر", equipment:"جهاز/كيبل"},
  {name:"Pull-up", muscle:"الظهر", equipment:"وزن الجسم"},
  {name:"Push-up", muscle:"الصدر", equipment:"وزن الجسم"},
  {name:"Dumbbell Bench Press", muscle:"الصدر", equipment:"دمبل"},
  {name:"Dips", muscle:"الصدر", equipment:"وزن الجسم"},
  {name:"Lateral Raise", muscle:"الكتف", equipment:"دمبل"},
  {name:"Front Raise", muscle:"الكتف", equipment:"دمبل"},
  {name:"Arnold Press", muscle:"الكتف", equipment:"دمبل"},
  {name:"Barbell Curl", muscle:"الباي", equipment:"بار حر"},
  {name:"Concentration Curl", muscle:"الباي", equipment:"دمبل"},
  {name:"Skull Crusher", muscle:"التراي", equipment:"بار حر"},
  {name:"Dips (Triceps)", muscle:"التراي", equipment:"وزن الجسم"},
  {name:"Lunges", muscle:"الأرجل", equipment:"دمبل"},
  {name:"Bulgarian Split Squat", muscle:"الأرجل", equipment:"دمبل"},
  {name:"Hip Thrust", muscle:"الأرداف", equipment:"بار حر"},
  {name:"Cable Kickback", muscle:"الأرداف", equipment:"كيبل"},
  {name:"Plank", muscle:"البطن", equipment:"وزن الجسم"},
  {name:"Cable Crunch", muscle:"البطن", equipment:"كيبل"},
  {name:"Hanging Leg Raise", muscle:"البطن", equipment:"وزن الجسم"},
  {name:"Treadmill", muscle:"كارديو", equipment:"جهاز"},
  {name:"Rowing Machine", muscle:"كارديو", equipment:"جهاز"}
];
AF.EXTRA_EXERCISES.forEach(e=>AF.EXERCISE_DB.push({...e, workoutId:"freeplay"}));

// Colloquial / alias phrases → canonical DB entry name. Keys are normalized at lookup time.
AF.EXERCISE_ALIASES = {
  "عقله": "عقلة بمساعدة", "عقلة": "عقلة بمساعدة", "عقلة حرة": "Pull-up", "عقلة على الجهاز":"عقلة بمساعدة",
  "بنش": "Bench Press", "بنش برس": "Bench Press", "ضغط صدر": "Bench Press",
  "بنش دمبل": "Dumbbell Bench Press", "ضغط صدر دمبل": "Dumbbell Bench Press",
  "سكوات": "Squat", "قرفصاء": "Squat",
  "ددليفت": "Deadlift", "رفعة ميتة": "Deadlift", "الرفعة الميتة": "Deadlift",
  "لات": "Lat Pulldown", "سحب لات": "Lat Pulldown", "سحب علوي": "سحب علوي",
  "ضغط كتف": "Shoulder Press", "برس كتف": "Shoulder Press",
  "رفرفة جانبية": "Cable Lateral Raise", "رفرفة": "Cable Lateral Raise",
  "بايسبس": "EZ Bar Curl", "باي": "EZ Bar Curl", "تجديف": "Barbell Row", "تجديف بار": "Barbell Row",
  "تراي": "Rope Pushdown", "ضغط حبل": "Rope Pushdown",
  "دفعة ورك": "Hip Thrust", "هيب ثرست": "Hip Thrust",
  "غطس": "Dips", "منخفضات": "Dips",
  "ضغط": "Push-up", "ضغط أرضي": "Push-up",
  "بطن": "Cable Crunch", "معدة": "Cable Crunch",
  "مشاية": "Treadmill", "جري": "Treadmill",
  "لنجز": "Lunges", "طعنات": "Lunges"
};

function normalizeAr(s){
  return String(s||"").trim().toLowerCase()
    .replace(/[إأآا]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي')
    .replace(/[\u064B-\u0652]/g,'') // remove tashkeel
    .replace(/\s+/g,' ');
}

function tokenOverlapScore(a,b){
  const ta = new Set(normalizeAr(a).split(' ').filter(Boolean));
  const tb = new Set(normalizeAr(b).split(' ').filter(Boolean));
  if(!ta.size||!tb.size) return 0;
  let hits=0; ta.forEach(t=>{ if(tb.has(t)) hits++; });
  return hits/Math.max(ta.size,tb.size);
}

// Detects equipment hints mentioned alongside a name, e.g. "عقلة على الجهاز" vs "عقلة حرة".
AF.detectEquipmentHint = function(query){
  const n = normalizeAr(query);
  if(/جهاز|مكينه|مكينة|machine/.test(n)) return "جهاز";
  if(/كيبل|cable/.test(n)) return "كيبل";
  if(/دمبل|dumbbell/.test(n)) return "دمبل";
  if(/بار|barbell|حر(?!ة)/.test(n)) return "بار حر";
  if(/وزن الجسم|bodyweight|حره|حرة/.test(n)) return "وزن الجسم";
  return null;
};

// Main entry: returns {match, confidence, candidates, equipmentHint} — never throws.
AF.matchExercise = function(query){
  const q = normalizeAr(query);
  if(!q) return {match:null, confidence:0, candidates:[], equipmentHint:null};
  const equipmentHint = AF.detectEquipmentHint(query);

  // 1) exact alias
  const aliasHit = AF.EXERCISE_ALIASES[q];
  if(aliasHit){
    const entry = AF.EXERCISE_DB.find(e=>e.name===aliasHit);
    if(entry) return {match:entry, confidence:1, candidates:[], equipmentHint};
  }
  // 2) exact db name (case/diacritics-insensitive)
  const exact = AF.EXERCISE_DB.find(e=>normalizeAr(e.name)===q);
  if(exact) return {match:exact, confidence:1, candidates:[], equipmentHint};

  // 3) alias substring match
  for(const [alias,canonical] of Object.entries(AF.EXERCISE_ALIASES)){
    if(q.includes(alias) || alias.includes(q)){
      const entry = AF.EXERCISE_DB.find(e=>e.name===canonical);
      if(entry) return {match:entry, confidence:0.85, candidates:[], equipmentHint};
    }
  }

  // 4) fuzzy token-overlap ranking across DB + alias keys
  const scored = AF.EXERCISE_DB.map(e=>({
    entry:e,
    score: Math.max(tokenOverlapScore(q,e.name), normalizeAr(e.name).includes(q)||q.includes(normalizeAr(e.name))?0.6:0)
  })).sort((a,b)=>b.score-a.score).filter(s=>s.score>0);

  if(scored.length && scored[0].score>=0.7){
    return {match:scored[0].entry, confidence:scored[0].score, candidates:scored.slice(1,4).map(s=>s.entry), equipmentHint};
  }
  if(scored.length){
    return {match:null, confidence:0, candidates:scored.slice(0,4).map(s=>s.entry), equipmentHint};
  }
  return {match:null, confidence:0, candidates:[], equipmentHint};
};
