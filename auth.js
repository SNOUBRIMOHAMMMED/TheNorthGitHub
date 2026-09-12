/* One identity: Supabase Auth. No local password authentication. */
(() => {
  const url='https://mqefttfbwkqucesjrqir.supabase.co';
  const key='sb_publishable_-Ya5KJs1cmv6C07-JMCu2g_IPxWRDcr';
  const client=window.supabase?.createClient(url,key);
  const check=r=>{if(r.error)throw r.error;return r.data;};
  window.NorthAuth={
    client,
    async login(email,password){if(!client)throw Error('network');return check(await client.auth.signInWithPassword({email,password}));},
    async signup(email,password,name,lang){if(!client)throw Error('network');return check(await client.auth.signUp({email,password,options:{data:{name,lang}}}));},
    async session(){if(!client)throw Error('network');return check(await client.auth.getSession()).session;},
    async logout(){if(!client)return;check(await client.auth.signOut({scope:'local'}));}
  };
})();
