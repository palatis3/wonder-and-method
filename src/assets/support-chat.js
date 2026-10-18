const launcher=document.querySelector('.support-chat-launch');
if(launcher){
 const root=launcher.closest('.support-chat');
 const fallback=root.querySelector('.support-chat-fallback');
 const label=launcher.querySelector('span');
 const status=document.querySelector('#support-chat-status');
 let requested=false,ready=false,dismissed=false,timeout,focusObserver,focusTimeout;
 const stopFocus=()=>{focusObserver?.disconnect();clearTimeout(focusTimeout);};
 const focusChat=()=>{
  if(dismissed){stopFocus();return;}
  const active=document.activeElement;
  if(active&&active!==launcher&&active!==document.body){stopFocus();return;}
  const frame=[...document.querySelectorAll('iframe[title="Chat widget"]')].find(frame=>{
   const rect=frame.getBoundingClientRect();return rect.width>100&&rect.height>150&&getComputedStyle(frame).visibility!=='hidden';
  });
  if(frame){frame.focus();status.textContent='Chat opened. Follow the chat privacy choices to continue.';stopFocus();}
 };
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
  stopFocus();
  const next=document.querySelector('.back-to-top:not([hidden]):not(.is-obstructing-controls)')||document.querySelector('.site-header .wordmark');
  next?.focus();
 });
 launcher.hidden=false;
 launcher.addEventListener('click',()=>{
  if(requested)return;
  requested=true;
  launcher.setAttribute('aria-disabled','true');
  label.textContent='Opening chat…';
  window.Tawk_API=window.Tawk_API||{};
  window.Tawk_API.onChatMaximized=focusChat;
  const openWhenReady=()=>{
   if(ready)return;
   ready=true;
  focusObserver=new MutationObserver(focusChat);
  focusObserver.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['style']});
  focusTimeout=setTimeout(stopFocus,10000);
   clearTimeout(timeout);
   root.hidden=true;
   if(dismissed)window.Tawk_API.hideWidget();
   else {window.Tawk_API.maximize();focusChat();}
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
