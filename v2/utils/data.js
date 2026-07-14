window.AF = window.AF || {};

AF.FOODS = [
  {id:"rice_white",name:"أرز أبيض مطبوخ",cal:130,protein:2.7,carb:28,fat:0.3},
  {id:"rice_brown",name:"أرز بني مطبوخ",cal:112,protein:2.6,carb:24,fat:0.9},
  {id:"chicken_breast",name:"صدر دجاج مشوي",cal:165,protein:31,carb:0,fat:3.6},
  {id:"chicken_thigh",name:"فخذ دجاج مشوي",cal:209,protein:26,carb:0,fat:10.9},
  {id:"egg",name:"بيضة مسلوقة",cal:155,protein:13,carb:1.1,fat:11},
  {id:"dates",name:"تمر",cal:277,protein:1.8,carb:75,fat:0.2},
  {id:"laban",name:"لبن رائب",cal:61,protein:3.5,carb:4.7,fat:3.3},
  {id:"pita_bread",name:"خبز عربي",cal:275,protein:9,carb:55,fat:1.5},
  {id:"hummus",name:"حمص",cal:166,protein:8,carb:14,fat:9.6},
  {id:"olive_oil",name:"زيت زيتون",cal:884,protein:0,carb:0,fat:100},
  {id:"banana",name:"موز",cal:89,protein:1.1,carb:23,fat:0.3},
  {id:"apple",name:"تفاح",cal:52,protein:0.3,carb:14,fat:0.2},
  {id:"oats",name:"شوفان جاف",cal:389,protein:17,carb:66,fat:7},
  {id:"milk",name:"حليب كامل الدسم",cal:61,protein:3.2,carb:4.8,fat:3.3},
  {id:"cheese_white",name:"جبنة بيضاء",cal:264,protein:18,carb:3.4,fat:21},
  {id:"tuna",name:"تونة (معلبة بالماء)",cal:116,protein:26,carb:0,fat:0.8},
  {id:"salmon",name:"سلمون مشوي",cal:208,protein:20,carb:0,fat:13},
  {id:"potato",name:"بطاطس مسلوقة",cal:87,protein:1.9,carb:20,fat:0.1},
  {id:"sweet_potato",name:"بطاطا حلوة مسلوقة",cal:86,protein:1.6,carb:20,fat:0.1},
  {id:"broccoli",name:"بروكلي مطبوخ",cal:35,protein:2.4,carb:7.2,fat:0.4},
  {id:"mixed_nuts",name:"مكسرات مشكلة",cal:607,protein:20,carb:21,fat:54},
  {id:"honey",name:"عسل",cal:304,protein:0.3,carb:82,fat:0},
  {id:"greek_yogurt",name:"زبادي يوناني",cal:59,protein:10,carb:3.6,fat:0.4},
  {id:"beef",name:"لحم بقر مشوي",cal:250,protein:26,carb:0,fat:17},
  {id:"lentil_soup",name:"شوربة عدس",cal:93,protein:6.3,carb:14,fat:1.5},
  {id:"falafel",name:"فلافل",cal:333,protein:13,carb:32,fat:18},
  {id:"shawarma_chicken",name:"شاورما دجاج",cal:220,protein:18,carb:15,fat:10},
  {id:"protein_shake",name:"مسحوق بروتين (سكوب)",cal:120,protein:24,carb:3,fat:1.5},
  {id:"avocado",name:"أفوكادو",cal:160,protein:2,carb:8.5,fat:14.7},
  {id:"quinoa",name:"كينوا مطبوخة",cal:120,protein:4.4,carb:21,fat:1.9},
  {id:"kabsa_chicken",name:"كبسة دجاج",cal:190,protein:11,carb:22,fat:6.5},
  {id:"mandi_lamb",name:"مندي لحم",cal:230,protein:16,carb:18,fat:10},
  {id:"foul",name:"فول مدمس",cal:110,protein:7,carb:17,fat:1.5},
  {id:"shakshuka",name:"شكشوكة",cal:130,protein:7,carb:6,fat:9},
  {id:"grilled_fish",name:"سمك مشوي (هامور)",cal:140,protein:24,carb:0,fat:4.5},
  {id:"shrimp",name:"روبيان مطبوخ",cal:99,protein:24,carb:0.2,fat:0.3},
  {id:"turkey_breast",name:"صدر ديك رومي مشوي",cal:135,protein:30,carb:0,fat:1},
  {id:"labneh",name:"لبنة",cal:290,protein:11,carb:5,fat:26},
  {id:"cottage_cheese",name:"جبنة قريش",cal:98,protein:11,carb:3.4,fat:4.3},
  {id:"whole_wheat_bread",name:"خبز أسمر",cal:247,protein:13,carb:41,fat:3.4},
  {id:"pasta_cooked",name:"معكرونة مسلوقة",cal:158,protein:5.8,carb:31,fat:0.9},
  {id:"cucumber",name:"خيار",cal:15,protein:0.7,carb:3.6,fat:0.1},
  {id:"tomato",name:"طماطم",cal:18,protein:0.9,carb:3.9,fat:0.2},
  {id:"orange",name:"برتقال",cal:47,protein:0.9,carb:12,fat:0.1},
  {id:"almonds",name:"لوز",cal:579,protein:21,carb:22,fat:50},
  {id:"peanut_butter",name:"زبدة فول سوداني",cal:588,protein:25,carb:20,fat:50},

  // زبادي ندى اليوناني — كل الأنواع والنكهات (قيم تقريبية لكل 100 جرام)
  {id:"nada_greek_lowfat",name:"زبادي يوناني ندى سادة قليل الدسم",cal:66,protein:7,carb:5,fat:2},
  {id:"nada_greek_fullfat",name:"زبادي يوناني ندى سادة كامل الدسم",cal:114,protein:6,carb:5,fat:8},
  {id:"nada_greek_zero",name:"زبادي يوناني ندى 0% دسم",cal:55,protein:9,carb:4,fat:0},
  {id:"nada_greek_berries",name:"زبادي يوناني ندى بالتوت",cal:135,protein:4.7,carb:15.3,fat:6},
  {id:"nada_greek_dates",name:"زبادي يوناني ندى بالتمر",cal:145,protein:4,carb:20,fat:5},
  {id:"nada_greek_mango",name:"زبادي يوناني ندى بالمانجو",cal:120,protein:4.2,carb:17,fat:4},
  {id:"nada_greek_drink",name:"شراب زبادي يوناني ندى",cal:122,protein:4,carb:16,fat:4},

  // شوفان الهنا (قيم تقريبية للشوفان الجاف قبل الطبخ لكل 100 جرام)
  {id:"alhana_oats",name:"شوفان الهنا",cal:379,protein:13,carb:68,fat:7},

  // دجاجة كاملة
  {id:"whole_chicken_bonein",name:"دجاجة كاملة مشوية (وزن مع العظم، مع الجلد)",cal:172,protein:19,carb:0,fat:10},
  {id:"whole_chicken_meat_only",name:"لحم دجاجة كاملة منزوع العظم (بدون جلد)",cal:190,protein:29,carb:0,fat:7.5},

  // أصناف ووجبات إضافية
  {id:"kunafa",name:"كنافة",cal:340,protein:6,carb:40,fat:17},
  {id:"baklava",name:"بقلاوة",cal:430,protein:6,carb:48,fat:24},
  {id:"samosa",name:"سمبوسة لحم",cal:260,protein:8,carb:24,fat:15},
  {id:"corn",name:"ذرة مسلوقة",cal:96,protein:3.4,carb:21,fat:1.5},
  {id:"watermelon",name:"بطيخ",cal:30,protein:0.6,carb:7.6,fat:0.2},
  {id:"grapes",name:"عنب",cal:69,protein:0.7,carb:18,fat:0.2},
  {id:"dark_chocolate",name:"شوكولاتة داكنة",cal:546,protein:7.8,carb:46,fat:31},
  {id:"cheddar",name:"جبنة شيدر",cal:403,protein:23,carb:1.3,fat:33},
  {id:"orange_juice",name:"عصير برتقال طازج",cal:45,protein:0.7,carb:10.4,fat:0.2},
  {id:"grilled_beef_kabab",name:"كباب لحم مشوي",cal:215,protein:22,carb:2,fat:13}
];

AF.QUICK_MEALS = [
  {name:"دجاج وأرز",items:[{id:"chicken_breast",qty:150},{id:"rice_white",qty:200}]},
  {name:"إفطار بيض وتمر",items:[{id:"egg",qty:120},{id:"dates",qty:40}]},
  {name:"شاورما دجاج",items:[{id:"shawarma_chicken",qty:250}]},
  {name:"زبادي ومكسرات",items:[{id:"greek_yogurt",qty:170},{id:"mixed_nuts",qty:30}]},
  {name:"شيك بروتين وموز",items:[{id:"protein_shake",qty:30},{id:"banana",qty:120},{id:"milk",qty:250}]},
  {name:"تونة وخبز",items:[{id:"tuna",qty:120},{id:"pita_bread",qty:60}]},
  {name:"فطور شوفان الهنا وزبادي ندى",items:[{id:"alhana_oats",qty:50},{id:"nada_greek_lowfat",qty:170},{id:"banana",qty:100}]},
  {name:"دجاجة كاملة وأرز",items:[{id:"whole_chicken_meat_only",qty:200},{id:"rice_white",qty:200}]}
];

AF.EX_INFO = {
  "عقلة بمساعدة":{tip:"اسحب لوحك للأعلى بالتحكم، ركّز على الظهر لا الذراع.",alt:["سحب علوي واسع"]},
  "سحب علوي":{tip:"اسحب المقبض حتى أعلى الصدر مع فرد الصدر.",alt:["عقلة بمساعدة","سحب أرضي"]},
  "سحب أرضي":{tip:"حافظ على استقامة الظهر واسحب بمرفقين قريبين من الجسم.",alt:["Chest Supported Row"]},
  "سحب ذراع مستقيمة":{tip:"حركة عزل لعضلة الظهر العريضة، لا تُحني المرفق كثيرًا.",alt:["Straight Arm Pulldown"]},
  "Face Pull":{tip:"اسحب الحبل نحو الوجه مع فتح المرفقين للخارج.",alt:["Rear Delt Machine"]},
  "EZ Bar Curl":{tip:"لا تتأرجح بالجسم، ركّز على البايسبس.",alt:["Cable Curl"]},
  "Incline Dumbbell Curl":{tip:"يمنح مدى حركة أطول للبايسبس.",alt:["Hammer Curl"]},
  "Reverse Curl":{tip:"قبضة معكوسة تستهدف الساعد العلوي.",alt:["Wrist Curl"]},
  "Wrist Curl":{tip:"حركة صغيرة من الرسغ فقط.",alt:["Reverse Curl"]},
  "Bench Press":{tip:"لوح ثابت، اخفض بالتحكم حتى يلمس الصدر تقريبًا.",alt:["Incline Dumbbell Press"]},
  "Incline Dumbbell Press":{tip:"يستهدف الجزء العلوي من الصدر.",alt:["Bench Press"]},
  "Cable Fly":{tip:"حركة عزل، حافظ على انحناء بسيط بالمرفق.",alt:["Incline Dumbbell Press"]},
  "Cable Lateral Raise":{tip:"ارفع بزاوية للخارج والأمام قليلًا، لا ترفع الكتف.",alt:["Shoulder Press"]},
  "Shoulder Press":{tip:"ادفع للأعلى دون قوس زائد بالظهر.",alt:["Cable Lateral Raise"]},
  "Rope Pushdown":{tip:"افرد المرفقين بالكامل بالأسفل مع تثبيت الكتف.",alt:["Overhead Cable Extension"]},
  "Overhead Cable Extension":{tip:"يمنح تمدد أكبر لرأس التراي الطويلة.",alt:["Rope Pushdown"]},
  "Squat":{tip:"انزل حتى يوازي الفخذ الأرض على الأقل، الركبة بخط القدم.",alt:["Leg Press"]},
  "Romanian Deadlift":{tip:"حافظ على استقامة الظهر وادفع الحوض للخلف.",alt:["Leg Curl"]},
  "Leg Press":{tip:"لا تُقفل الركبة بالكامل بالأعلى.",alt:["Squat"]},
  "Leg Curl":{tip:"عزل للعضلة الخلفية للفخذ.",alt:["Romanian Deadlift"]},
  "Leg Extension":{tip:"عزل للفخذ الأمامي، حركة بطيئة بالأسفل.",alt:["Leg Press"]},
  "Standing Calf Raise":{tip:"مدى حركة كامل، توقف لحظة بالأعلى.",alt:[]},
  "Rear Delt Machine":{tip:"يستهدف الكتف الخلفي بعزل جيد.",alt:["Face Pull"]},
  "Chest Supported Row":{tip:"يقلل الغش الحركي ويركّز على الظهر.",alt:["سحب أرضي"]},
  "Single Arm Lat Pulldown":{tip:"عزل جانب واحد من الظهر لكل مرة.",alt:["سحب علوي"]},
  "Straight Arm Pulldown":{tip:"ذراع شبه مستقيمة طوال الحركة.",alt:["سحب ذراع مستقيمة"]},
  "Hammer Curl":{tip:"قبضة محايدة، يستهدف الساعد والبايسبس.",alt:["EZ Bar Curl"]},
  "Cable Curl":{tip:"شد مستمر على البايسبس بسبب الكيبل.",alt:["EZ Bar Curl"]},
  "Pushdown":{tip:"ثبّت المرفقين بجانب الجسم طوال الحركة.",alt:["Rope Pushdown"]},
  "Overhead Extension":{tip:"تمدد جيد لرأس التراي الطويلة.",alt:["Overhead Cable Extension"]}
};

AF.WORKOUTS = [
  {id:"pull",name:"PULL",subtitle:"ظهر + باي + سواعد",groups:[["الظهر",[["عقلة بمساعدة",4,"6-10"],["سحب علوي",3,"8-10"],["سحب أرضي",3,"8-10"],["سحب ذراع مستقيمة",3,"12-15"]]],["الكتف الخلفي",[["Face Pull",3,"12-15"]]],["الباي",[["EZ Bar Curl",3,"8-10"],["Incline Dumbbell Curl",3,"10-12"]]],["السواعد",[["Reverse Curl",3,"10-12"],["Wrist Curl",3,"12-15"]]]]},
  {id:"push",name:"PUSH",subtitle:"صدر + كتف + تراي",groups:[["الصدر",[["Bench Press",3,"6-8"],["Incline Dumbbell Press",3,"8-10"],["Cable Fly",2,"12-15"]]],["الكتف",[["Cable Lateral Raise",4,"12-15"],["Shoulder Press",3,"8-10"]]],["التراي",[["Rope Pushdown",4,"10-12"],["Overhead Cable Extension",3,"10-12"]]]]},
  {id:"legs",name:"LEGS",subtitle:"أرجل + كتف",groups:[["الأرجل",[["Squat",4,"6-8"],["Romanian Deadlift",3,"8-10"],["Leg Press",3,"10-12"],["Leg Curl",3,"10-12"],["Leg Extension",3,"12-15"],["Standing Calf Raise",4,"15-20"]]],["الكتف",[["Cable Lateral Raise",4,"12-15"],["Rear Delt Machine",3,"12-15"]]]]},
  {id:"optional",name:"اختياري",subtitle:"ظهر + ذراع + سواعد",groups:[["الظهر",[["Chest Supported Row",3,"8-12"],["Single Arm Lat Pulldown",3,"10-12"],["Straight Arm Pulldown",3,"12-15"]]],["الذراع",[["Hammer Curl",3,"10-12"],["Cable Curl",3,"10-12"],["Pushdown",3,"10-12"],["Overhead Extension",3,"10-12"]]],["السواعد",[["Reverse Curl",3,"10-12"],["Wrist Curl",3,"12-15"]]]]}
];

// Large curated food DB (Albatil Foods v1.0, 1250+ items) loaded from foods-db.js, adapted to our {id,name,cal,protein,carb,fat} shape.
AF.EXTERNAL_FOODS = (window.ALBATIL_FOODS_DB?.foods||[]).map(f=>({
  id:f.id, name:f.name_ar,
  cal:f.per_100g.calories, protein:f.per_100g.protein_g, carb:f.per_100g.carbs_g, fat:f.per_100g.fat_g
}));

AF.ACHIEVEMENTS = [
  {id:'first_workout',icon:'🥇',name:'أول حصة',desc:'أكملت أول تمرين',check:c=>c.history.length>=1},
  {id:'ten_workouts',icon:'🏋️',name:'10 حصص',desc:'أكملت 10 تمارين',check:c=>c.history.length>=10},
  {id:'fifty_workouts',icon:'💪',name:'50 حصة',desc:'أكملت 50 تمرين',check:c=>c.history.length>=50},
  {id:'first_pr',icon:'🏆',name:'أول رقم قياسي',desc:'سجّلت أول PR',check:c=>Object.keys(c.prs).length>=1},
  {id:'streak_7',icon:'🔥',name:'التزام أسبوع',desc:'7 أيام متتالية',check:(c,streak)=>streak>=7},
  {id:'streak_30',icon:'🌟',name:'التزام شهر',desc:'30 يوم متتالي',check:(c,streak)=>streak>=30},
  {id:'nutrition_7',icon:'🍗',name:'تغذية منتظمة',desc:'سجّلت وجبات 7 أيام مختلفة',check:c=>new Set(c.nutrition.logs.map(l=>l.date)).size>=7},
  {id:'measure_5',icon:'📏',name:'متابع مقاييس',desc:'5 قياسات جسم',check:c=>c.measurements.length>=5}
];
