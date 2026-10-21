import {escapeHtml as e} from './shared.mjs';

export function supportChatConfig(config){
 const chat=config.supportChat;
 if(!chat?.enabled||config.reviewOnly)return null;
 if(chat.provider!=='tawk'||!/^[a-f0-9]{24}$/.test(chat.propertyId||'')||!/^[a-zA-Z0-9]{5,32}$/.test(chat.widgetId||''))throw Error('Support chat requires the actual tawk.to property and widget identifiers.');
 if(config.mode!=='production'||config.formMode!=='live')return null;
 if(chat.verified!==true||!config.privacy?.chat||!config.privacy?.processors?.some(p=>p.name==='tawk.to'))throw Error('Support chat requires verified delivery and a current privacy notice.');
 return chat;
}

export function supportChatMarkup(config,{formPage=false}={}){
 const chat=supportChatConfig(config);if(!chat)return '';
 return `<div class="support-chat${formPage?' support-chat--inline':''}" data-chat-script="https://embed.tawk.to/${e(chat.propertyId)}/${e(chat.widgetId)}">${formPage?'':`<button class="support-chat-launch" type="button" aria-label="Chat with Terry (opens chat, uses cookies)" title="Chat with Terry" aria-describedby="support-chat-description" hidden><svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22"><path d="M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-5 3v-3a2 2 0 0 1-2-2V7a3 3 0 0 1 3-3Z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M7 9h10M7 13h7" fill="none" stroke="currentColor" stroke-width="1.6"/></svg><span>Chat with Terry</span><small>Uses cookies</small></button>`}<p id="support-chat-description" class="support-chat-description">Chat runs on an outside service that uses cookies. Prefer not to? Use the contact form.</p><noscript><p><a href="/contact/#inquiry">Use the contact form</a>. Live chat needs JavaScript.</p></noscript><div class="support-chat-fallback" hidden><p>Chat could not connect. You can send me a message through the contact form.</p><a href="/contact/">Contact the studio</a><button type="button" class="support-chat-dismiss" aria-label="Dismiss chat connection message">×</button></div></div><p id="support-chat-status" class="support-chat-status sr-only" role="status" aria-live="polite"></p><script type="module" src="/assets/support-chat.js"></script>`;
}

export function supportChatCsp(config){
 if(!supportChatConfig(config))return null;
 // Widget-open inventory: embed serves scripts/styles/images; va handles chat
 // requests and rotating vsb hosts handle WebSockets. Keep variable service
 // endpoints allowed, but external executable scripts use exact observed hosts.
 // Tawk injects inline styles for its iframe controls.
 return {
  script:"https://embed.tawk.to https://cdn.jsdelivr.net/emojione/2.2.7/lib/js/emojione.min.js",
  style:"'unsafe-inline' https://*.tawk.to",
  image:'https://*.tawk.to blob:',
  font:'https://*.tawk.to',
  connect:'https://*.tawk.to wss://*.tawk.to',
  frame:'https://*.tawk.to',
  media:'https://*.tawk.to blob:'
 };
}
