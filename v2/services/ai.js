window.AF = window.AF || {};

// Builds a compact Arabic-language stats summary and asks Claude for 3-4 short,
// specific coaching insights (trends up/down, protein vs goal, etc).
AF.getAIInsights = async function(stats){
  if(!window.claude || !window.claude.complete){
    return { ok:false, text:"ميزة التحليل الذكي غير متاحة في هذه البيئة حاليًا." };
  }
  const prompt = `أنت مدرب لياقة بدنية محترف. بناءً على البيانات التالية (بصيغة JSON) لمستخدم تطبيق تمارين وتغذية،
اكتب 3 إلى 4 ملاحظات قصيرة جدًا وذكية بالعربية (كل ملاحظة سطر واحد، بدون مقدمات) تلاحظ فيها تغيرات حقيقية
(مثل: حجم تمرين عضلة معينة ارتفع/انخفض، رقم قياسي تحسّن، الوزن يتجه لأسفل/أعلى، البروتين أقل من الهدف...).
لا تخترع أرقامًا غير موجودة بالبيانات. إذا البيانات قليلة جدًا قل ذلك بلطف واقترح تسجيل المزيد.

البيانات:
${JSON.stringify(stats)}`;
  try{
    const text = await window.claude.complete(prompt);
    return { ok:true, text };
  }catch(e){
    return { ok:false, text:"تعذر توليد التحليل الذكي الآن، حاول لاحقًا." };
  }
};
