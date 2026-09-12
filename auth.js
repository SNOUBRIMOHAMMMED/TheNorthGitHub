/* One identity: Supabase Auth. No local password authentication. */
(() => {
  const url='https://mqefttfbwkqucesjrqir.supabase.co';
  const key='sb_publishable_-Ya5KJs1cmv6C07-JMCu2g_IPxWRDcr';
  const client=window.supabase?.createClient(url,key);
  const check=r=>{if(r.error)throw r.error;return r.data;};
  window.NorthAuth={
    client,
    async login(email,password){if(!client)throw Error('network');return check(await client.auth.signInWithPassword({email,password}));},
    async signup(email,password,name,lang){
      if(!client)throw Error('network');
      const redirectTo = typeof window !== 'undefined' && window.location ? (window.location.origin + window.location.pathname) : undefined;
      return check(await client.auth.signUp({email,password,options:{emailRedirectTo:redirectTo,data:{name,lang}}}));
    },
    async session(){if(!client)throw Error('network');return check(await client.auth.getSession()).session;},
    async logout(){if(!client)return;check(await client.auth.signOut({scope:'local'}));}
  };
})();

/* Safe public messages: never render a raw server response or credentials. */
window.NorthAuth.errorMessage = (error, lang, signup) => {
  const messages = {
    invalid_credentials: ['البريد أو كلمة المرور غير صحيحين.', 'Incorrect email or password.'],
    email_not_confirmed: ['أكّد بريدك من رسالة التأكيد ثم سجّل الدخول.', 'Confirm your email, then sign in.'],
    weak_password: ['كلمة المرور لا تستوفي شروط الأمان. استخدم كلمة أطول وأقوى.', 'Use a longer, stronger password.'],
    email_address_invalid: ['تحقق من كتابة عنوان البريد الإلكتروني.', 'Check your email address.'],
    email_address_not_authorized: ['إرسال رسالة التأكيد لهذا البريد غير متاح حاليًا. يجب على مسؤول التطبيق إعداد خدمة البريد SMTP في Supabase.', 'Confirmation email is unavailable for this address. The app administrator must configure Supabase SMTP.'],
    over_email_send_rate_limit: ['بلغ إرسال رسائل التأكيد الحد المسموح. انتظر قبل المحاولة مجددًا.', 'Confirmation email limit reached. Wait before trying again.'],
    over_request_rate_limit: ['محاولات كثيرة. انتظر قليلًا ثم أعد المحاولة.', 'Too many attempts. Please wait and try again.'],
    signup_disabled: ['إنشاء الحسابات غير مفعّل حاليًا. تواصل مع مسؤول التطبيق.', 'Account registration is currently disabled. Contact the app administrator.'],
    email_provider_disabled: ['التسجيل بالبريد غير مفعّل حاليًا. تواصل مع مسؤول التطبيق.', 'Email authentication is disabled. Contact the app administrator.'],
    user_already_exists: ['الحساب موجود بالفعل. اختر تسجيل الدخول.', 'Account already exists. Choose Sign in.'],
    unexpected_failure: ['تعذر إتمام الطلب لدى خدمة الحسابات. على مسؤول التطبيق مراجعة سجلات Supabase Auth.', 'The account service could not complete this request. The administrator should check Supabase Auth logs.']
  };
  const code = error?.code;
  if (messages[code]) return messages[code][lang === 'ar' ? 0 : 1];
  if (error?.message === 'network' || error?.name === 'AuthRetryableFetchError' || /fetch|network|load failed/i.test(error?.message || ''))
    return lang === 'ar' ? 'تعذر الاتصال بخدمة الحسابات. تحقق من الإنترنت وأعد تحميل الصفحة.' : 'Cannot reach the account service. Check your connection and reload.';
  const ref = typeof code === 'string' && /^[a-z_]{1,64}$/.test(code) ? code : (Number.isInteger(error?.status) ? String(error.status) : 'unknown');
  return (lang === 'ar' ? (signup ? 'تعذر إنشاء الحساب.' : 'تعذر تسجيل الدخول.') + ' رمز التشخيص: ' : (signup ? 'Could not create account.' : 'Could not sign in.') + ' Diagnostic code: ') + ref;
};
