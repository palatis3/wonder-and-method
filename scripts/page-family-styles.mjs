import postcss from 'postcss';

export const pageStyleFamily=path=>path==='/'?'home':path.startsWith('/areas/')?'areas':path.startsWith('/guides/')?'guides':path.startsWith('/work/')?'work':path.startsWith('/services/')||path.startsWith('/checkout/')||['/pricing/','/payments/','/contact/','/process/'].includes(path)?'services':'information';

// Only positive, literal component classes may prove a selector cannot match.
// Functional selectors, generic rules, keyframes and all browser-created class
// names remain. Each family's retained rules keep their original cascade order.
const componentClasses=()=>/\.((?:studio-(?:home|pricing|form|workbench|concept|functional|service))|(?:(?:home|pricing|package|checkout|inquiry|contact|addon|buyer-pack|handoff|journal|concept)-[\w-]+))\b/g;
const words=text=>new Set(text.match(/[\w-]+/g)||[]);

export function pageFamilyStyles(css,html,dynamicSource=''){
 const available=words(html+'\n'+dynamicSource),root=postcss.parse(css);let removedRules=0;
 root.walkRules(rule=>{
  if(rule.parent?.type==='atrule'&&/keyframes$/i.test(rule.parent.name))return;
  if(/[()\\]/.test(rule.selector))return;
  const selectors=rule.selector.split(',');
  const retained=selectors.filter(selector=>![...selector.matchAll(componentClasses())].some(([,name])=>!available.has(name)));
  if(!retained.length){rule.remove();removedRules++;}
  else if(retained.length!==selectors.length)rule.selector=retained.join(',');
 });
 root.walkAtRules(rule=>{if(rule.nodes&&!rule.nodes.length)rule.remove();});
 return {css:root.toString(),removedRules};
}
