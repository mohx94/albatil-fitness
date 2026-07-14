window.AF = window.AF || {};

// Generic AI call: prefers a user-configured Cloudflare Worker (proxying Gemini, key hidden
// server-side) so the chat works after deploying to GitHub Pages. Falls back to window.claude
// (only available inside this design preview) when no worker is configured yet.
AF.getWorkerUrl = function(){ return (localStorage.getItem('albatil-ai-worker-url')||'').trim(); };
AF.setWorkerUrl = function(url){ localStorage.setItem('albatil-ai-worker-url', (url||'').trim()); };

AF.callAI = async function({system, messages}){
  const workerUrl = AF.getWorkerUrl();
  if(workerUrl){
    try{
      const res = await fetch(workerUrl, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({system, messages})
      });
      const data = await res.json();
      if(!res.ok || data.error) throw new Error(data.error||'worker error');
      return { ok:true, text: data.text||'' };
    }catch(e){
      return { ok:false, text:"تعذر الوصول لخادم المدرب الذكي (Worker). تأكد إن الرابط صحيح والمفتاح مضبوط بإعدادات Cloudflare، أو حاول لاحقًا." };
    }
  }
  if(window.claude && window.claude.complete){
    try{
      const text = messages ? await window.claude.complete({system, messages}) : await window.claude.complete(system);
      return { ok:true, text };
    }catch(e){
      return { ok:false, text:"تعذر توليد الرد الآن، حاول لاحقًا." };
    }
  }
  return { ok:false, text:"المحادثة الحرة غير متاحة الآن — اربط رابط Cloudflare Worker من الإعدادات ليعمل المدرب الذكي بعد الرفع على GitHub Pages." };
};

// Builds a compact Arabic-language stats summary and asks the AI for a full weekly plan,
// speaking naturally in Saudi dialect (not just short notes).
AF.getAIInsights = async function(stats){
  const system = `أنت مدرب لياقة بدنية سعودي محترف تتكلم باللهجة السعودية الطبيعية (مو فصحى جافة، أسلوب مدرب حقيقي بالنادي). بناءً على البيانات التالية (بصيغة JSON) لمستخدم تطبيق تمارين:

اكتب تحليل ثم خطة أسبوعية كاملة، بهذا الترتيب بالضبط:
1) سطرين تعليق سريع بأسلوب طبيعي (لهجة سعودية) على أداء الأسبوع الماضي.
2) "📋 خطة الأسبوع الجاي:" ثم نقاط محددة لكل يوم/عضلة (مثال: "الظهر: زد وزن السحب الأرضي 2.5 كجم إذا خلصت آخر مرة بـ RIR أقل من 2" أو "خفف حجم الكتف هالأسبوع، يحتاج راحة").
3) "🎯 التركيز الأهم:" جملة وحدة توضح أهم شي يركز عليه الأسبوع الجاي.
استخدم بيانات RIR (recentSetRir) وحالة الأسبوع (currentProgramWeek/isDeloadWeek) لتعطي توصية وزن محددة لتمرين معين إن أمكن.
اذكر تغيرات حقيقية بالحجم لكل عضلة، تحسّن الأرقام القياسية (PR) أو تقدير 1RM، اتجاه الوزن، والبروتين مقابل الهدف.
لا تخترع أرقامًا غير موجودة بالبيانات. إذا البيانات قليلة جدًا قل ذلك بلطف واقترح تسجيل المزيد. خلك مختصر ومباشر، بدون مقدمات طويلة.`;
  const res = await AF.callAI({system, messages:[{role:'user', content: JSON.stringify(stats)}]});
  return res;
};
