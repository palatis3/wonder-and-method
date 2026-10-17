import {escapeHtml as e} from './shared.mjs';

export function supportChatConfig(config){
 const chat=config.supportChat;
 if(!chat?.enabled||config.reviewOnly)return null;
 if(chat.provider!=='tawk'||!/^[a-f0-9]{24}$/.test(chat.propertyId||'')||!/^[a-zA-Z0-9]{5,32}$/.test(chat.widgetId||''))throw Error('Support chat requires the actual tawk.to property and widget identifiers.');
 if(config.mode!=='production'||config.formMode!=='live')return null;
 if(chat.verified!==true||!config.privacy?.chat||!config.privacy?.processors?.some(p=>p.name==='tawk.to'))throw Error('Support chat requires verified delivery and a current privacy notice.');
 return chat;
}

export function supportChatMarkup(config){
 const chat=supportChatConfig(config);if(!chat)return '';
 return `<aside class="support-chat" aria-label="Website chat"><button class="support-chat-launch" type="button" data-chat-script="https://embed.tawk.to/${e(chat.propertyId)}/${e(chat.widgetId)}" hidden><svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22"><path d="M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-5 3v-3a2 2 0 0 1-2-2V7a3 3 0 0 1 3-3Z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M7 9h10M7 13h7" fill="none" stroke="currentColor" stroke-width="1.6"/></svg><span>Message us</span></button><p class="support-chat-status sr-only" role="status" aria-live="polite"></p><div class="support-chat-fallback" hidden><p>Chat could not connect. You can still send us a message through the contact page.</p><a href="/contact/">Contact the studio</a><button type="button" class="support-chat-dismiss" aria-label="Dismiss chat connection message">×</button></div></aside><script type="module" src="/assets/support-chat.js"></script>`;
}

export function supportChatCsp(config){
 if(!supportChatConfig(config))return null;
 // Only the requested chat provider is admitted; no external script runs until
 // the visitor opens chat. Tawk injects inline styles for its iframe controls.
 return {
  script:"https://*.tawk.to https://cdn.jsdelivr.net/emojione/2.2.7/lib/js/emojione.min.js",
  style:"'unsafe-inline' https://*.tawk.to https://fonts.googleapis.com",
  image:'https://*.tawk.to blob:',
  font:'https://*.tawk.to https://fonts.gstatic.com',
  connect:'https://*.tawk.to wss://*.tawk.to',
  frame:'https://*.tawk.to',
  media:'https://*.tawk.to blob:'
 };
}
