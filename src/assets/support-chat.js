const chatRoot=document.querySelector('.support-chat');
if(chatRoot){
 const launcher=chatRoot.querySelector('.support-chat-launch');
 const triggers=[...document.querySelectorAll('[data-chat-open]')];
 if(launcher)triggers.unshift(launcher);
 const fallback=chatRoot.querySelector('.support-chat-fallback');
 const status=document.querySelector('#support-chat-status');
 let requested=false,ready=false,dismissed=false,failed=false,timeout,focusObserver,focusTimeout,opener;
 const toolsChanged=()=>document.dispatchEvent(new Event('page-tools-change'));
 const stopFocus=()=>{focusObserver?.disconnect();clearTimeout(focusTimeout);};
 const focusChat=()=>{
  if(dismissed){stopFocus();return;}
  const active=document.activeElement;
  if(active&&active!==opener&&active!==document.body){stopFocus();return;}
  const frame=[...document.querySelectorAll('iframe[title="Chat widget"]')].find(frame=>{
   const rect=frame.getBoundingClientRect();return rect.width>100&&rect.height>150&&getComputedStyle(frame).visibility!=='hidden';
  });
  if(frame){frame.focus();status.textContent='Chat opened. Follow the chat privacy choices to continue.';stopFocus();}
 };
 const watchFocus=()=>{
  stopFocus();focusObserver=new MutationObserver(focusChat);
  focusObserver.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['style']});
  focusTimeout=setTimeout(stopFocus,10000);
 };
 const setPending=(trigger,pending)=>{
  trigger.setAttribute('aria-disabled',String(pending));
  if(trigger===launcher){
   trigger.querySelector('span').textContent=pending?'Opening chat…':'Chat with Terry';
   trigger.setAttribute('aria-label',pending?'Opening chat with Terry':'Chat with Terry (opens chat, uses cookies)');
  }
 };
 const unavailable=()=>{
  if(ready)return;
  failed=true;stopFocus();clearTimeout(timeout);window.Tawk_API?.hideWidget?.();
  const keepFocus=document.activeElement===opener||document.activeElement===document.body;
  if(opener)setPending(opener,false);
  if(launcher)launcher.hidden=true;
  chatRoot.hidden=false;fallback.hidden=false;
  status.textContent='Chat could not connect. Use the contact link to send a message.';
  toolsChanged();if(keepFocus)fallback.querySelector('a').focus();
 };
 chatRoot.querySelector('.support-chat-dismiss').addEventListener('click',()=>{
  dismissed=true;chatRoot.hidden=true;stopFocus();
  const visible=node=>node&&!node.hidden&&node.getClientRects().length&&getComputedStyle(node).visibility!=='hidden'&&getComputedStyle(node).display!=='none';
  const next=[opener!==launcher?opener:null,document.querySelector('.back-to-top'),document.querySelector('footer a[href="#page-top"]'),document.querySelector('.site-header .wordmark,.concept-toolbar a[href="/work/"]')].find(visible);
  next?.focus();toolsChanged();
 });
 for(const trigger of triggers){
  trigger.hidden=false;
  trigger.addEventListener('click',()=>{
   if(requested&&!ready){if(failed){dismissed=false;chatRoot.hidden=false;fallback.hidden=false;fallback.querySelector('a').focus();}return;}
   opener=trigger;dismissed=false;
   if(ready){watchFocus();window.Tawk_API.showWidget?.();window.Tawk_API.maximize();focusChat();return;}
   requested=true;setPending(trigger,true);
   window.Tawk_API=window.Tawk_API||{};
   window.Tawk_API.onChatMaximized=()=>{document.documentElement.classList.add('chat-is-open');focusChat();};
   window.Tawk_API.onChatMinimized=()=>{document.documentElement.classList.remove('chat-is-open');toolsChanged();};
   const openWhenReady=()=>{
    if(failed||dismissed){clearTimeout(timeout);stopFocus();window.Tawk_API?.hideWidget?.();return;}
    if(ready)return;
    ready=true;watchFocus();clearTimeout(timeout);setPending(trigger,false);chatRoot.hidden=true;
    window.Tawk_API.maximize();focusChat();
   };
   // The provider's consent screen can be available before its onLoad event.
   window.Tawk_API.onBeforeLoad=openWhenReady;window.Tawk_API.onLoad=openWhenReady;
   const script=document.createElement('script');
   script.src=chatRoot.dataset.chatScript||launcher?.dataset.chatScript;
   script.async=true;script.charset='UTF-8';script.referrerPolicy='strict-origin-when-cross-origin';
   script.addEventListener('error',unavailable,{once:true});
   timeout=setTimeout(unavailable,15000);document.head.append(script);
  });
 }
 toolsChanged();
}
