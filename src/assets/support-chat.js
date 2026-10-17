const launcher=document.querySelector('.support-chat-launch');
if(launcher){
 const root=launcher.closest('.support-chat');
 const fallback=root.querySelector('.support-chat-fallback');
 const label=launcher.querySelector('span');
 const status=root.querySelector('.support-chat-status');
 let requested=false,ready=false,dismissed=false,timeout;
 const unavailable=()=>{
  if(ready)return;
  clearTimeout(timeout);
  launcher.hidden=true;
  fallback.hidden=false;
  status.textContent='Chat could not connect. Use the contact link to send a message.';
  fallback.querySelector('a').focus();
 };
 root.querySelector('.support-chat-dismiss').addEventListener('click',()=>{
  dismissed=true;
  root.hidden=true;
  const next=document.querySelector('main a[href^="/contact/"], header a[href^="/contact/"], .skip');
  next?.focus({preventScroll:true});
 });
 launcher.hidden=false;
 launcher.addEventListener('click',()=>{
  if(requested)return;
  requested=true;
  launcher.setAttribute('aria-disabled','true');
  label.textContent='Opening chat…';
  window.Tawk_API=window.Tawk_API||{};
  const openWhenReady=()=>{
   if(ready)return;
   ready=true;
   clearTimeout(timeout);
   root.hidden=true;
   if(dismissed)window.Tawk_API.hideWidget();
   else window.Tawk_API.maximize();
  };
  // The consent screen is available before onLoad, which can wait for consent.
  window.Tawk_API.onBeforeLoad=openWhenReady;
  window.Tawk_API.onLoad=openWhenReady;
  const script=document.createElement('script');
  script.src=launcher.dataset.chatScript;
  script.async=true;
  script.charset='UTF-8';
  script.referrerPolicy='strict-origin-when-cross-origin';
  script.addEventListener('error',unavailable,{once:true});
  timeout=setTimeout(unavailable,15000);
  document.head.append(script);
 });
}
