// Shared by the browser preview and the frame-driven Remotion composition.
// Each polygon follows a group in the selected illustrated artwork. These are
// textured paper fragments, not individually modeled landmark buildings.
import {letterClips} from './buffalo-letter-silhouettes.js';
export const ART_WIDTH = 1774;
export const ART_HEIGHT = 887;
export const MOTION_SPEED = 1.15;
export const LETTER_SECONDS = 2.1 / MOTION_SPEED;
export const ASSEMBLY_SECONDS = 15;
const definitions = [
  ['B', [
    ['tower', [[59,219],[111,193],[126,128],[155,128],[177,198],[212,219],[215,336],[190,430],[179,485],[61,478]]],
    ['bison', [[170,199],[248,184],[302,207],[323,252],[315,314],[280,333],[239,322],[224,375],[190,366],[211,330],[178,325]]],
    ['civic-paper', [[62,442],[81,420],[91,403],[100,368],[148,346],[170,395],[183,426],[222,451],[230,512],[210,551],[62,558]]],
    ['trees', [[202,407],[261,398],[312,448],[336,523],[294,513],[238,514],[224,488]]],
    ['sailboat', [[244,506],[312,495],[334,575],[291,604],[239,586]]],
    ['reeds-and-heron', [[60,541],[173,544],[210,625],[187,702],[60,702]]],
    ['water', [[171,595],[330,580],[319,642],[280,679],[188,703],[178,642]]],
  ]],
  ['U', [
    ['silos', [[338,209],[385,192],[438,208],[438,269],[481,288],[487,503],[340,519]]],
    ['birds', [[522,208],[610,208],[609,355],[520,365]]],
    ['bridge', [[483,366],[525,352],[610,380],[610,480],[484,478]]],
    ['ship', [[346,486],[381,447],[421,454],[445,488],[466,502],[464,591],[345,581]]],
    ['quay', [[471,482],[609,482],[609,577],[469,580]]],
    ['lake-waves', [[341,587],[609,583],[605,626],[577,661],[543,689],[491,706],[412,693],[361,645]]],
  ]],
  ['F', [
    ['theatre-sign', [[625,217],[647,195],[680,184],[710,211],[712,467],[693,488],[628,478]]],
    ['theatre-facade', [[708,206],[795,209],[795,333],[708,334]]],
    ['theatre-wing', [[708,390],[789,394],[789,485],[707,473]]],
    ['marquee', [[625,476],[715,465],[791,482],[787,532],[703,550],[626,521]]],
    ['jazz', [[627,547],[731,543],[738,586],[788,623],[788,675],[731,674],[726,701],[629,701]]],
  ]],
  ['F', [
    ['prairie-house', [[807,207],[839,193],[870,207],[1031,207],[1031,342],[809,341]]],
    ['glass-pavilion', [[813,342],[910,344],[909,418],[815,435]]],
    ['street-and-lamps', [[812,424],[930,420],[991,426],[998,483],[915,502],[812,488]]],
    ['canal-lock', [[816,480],[932,478],[928,602],[814,611]]],
    ['falling-water', [[815,603],[929,598],[929,700],[815,700]]],
  ]],
  ['A', [
    ['sky-paper', [[1085,205],[1179,205],[1151,354],[1119,354],[1094,380]]],
    ['left-turret', [[1041,279],[1067,231],[1087,302],[1087,443],[1094,491],[1015,497],[1031,412]]],
    ['right-turret', [[1146,275],[1173,223],[1198,313],[1228,496],[1170,492],[1151,446]]],
    ['brick-arches', [[1087,378],[1128,353],[1154,378],[1154,448],[1114,438],[1087,466]]],
    ['conservatory', [[1015,497],[1050,484],[1118,491],[1152,457],[1180,468],[1205,501],[1235,520],[1238,565],[1024,572]]],
    ['gardens', [[998,573],[1064,567],[1166,574],[1249,563],[1258,619],[1182,634],[1001,628]]],
    ['fountain', [[991,622],[1085,616],[1174,633],[1265,621],[1269,701],[969,701]]],
  ]],
  ['L', [
    ['electric-tower', [[1273,206],[1302,199],[1318,142],[1337,141],[1353,211],[1381,226],[1392,408],[1376,443],[1295,439]]],
    ['sun', [[1353,214],[1394,215],[1417,251],[1415,307],[1375,319],[1375,264]]],
    ['tree-canopy', [[1274,415],[1345,410],[1399,442],[1396,509],[1276,509]]],
    ['lion', [[1283,500],[1328,486],[1379,507],[1395,555],[1419,589],[1401,618],[1283,618]]],
    ['stone-and-garden', [[1277,609],[1410,605],[1445,627],[1464,700],[1277,700]]],
    ['lift-bridge', [[1398,451],[1429,430],[1452,451],[1468,619],[1407,610]]],
  ]],
  ['O', [
    ['birds', [[1465,283],[1527,224],[1579,214],[1586,333],[1537,371],[1461,365]]],
    ['bridge', [[1458,368],[1484,355],[1530,377],[1540,518],[1477,533],[1452,477]]],
    ['lighthouse', [[1578,245],[1624,221],[1660,251],[1671,441],[1581,442]]],
    ['sun-paper', [[1645,215],[1692,249],[1723,319],[1739,441],[1681,437],[1673,298]]],
    ['shore-rocks', [[1585,439],[1728,442],[1732,476],[1647,509],[1562,494]]],
    ['cresting-water', [[1464,510],[1520,515],[1566,477],[1677,494],[1731,478],[1719,542],[1681,579],[1465,573]]],
    ['food-and-football', [[1483,569],[1536,542],[1629,549],[1698,568],[1687,642],[1661,681],[1592,705],[1518,674],[1487,637]]],
  ]],
];

export const letters = definitions.map(([letter, parts], letterIndex) => ({letter,letterIndex,parts:parts.length,start:letterIndex*LETTER_SECONDS,arrivalEnd:letterIndex*LETTER_SECONDS+((parts.length-1)*.12+1.15)/MOTION_SPEED,clip:letterClips[letterIndex]}));
export const pieces = definitions.flatMap(([letter, parts], letterIndex) => parts.map(([name, polygon], partIndex) => {
  const xs=polygon.map(p=>p[0]), ys=polygon.map(p=>p[1]);
  const x=Math.min(...xs), y=Math.min(...ys), width=Math.max(...xs)-x, height=Math.max(...ys)-y;
  const seed=letterIndex*7+partIndex;
  return {id:`${letterIndex}-${name}`,letter,letterIndex,partIndex,name,x,y,width,height,
    clip:polygon.map(p=>`${(p[0]-x)/width*100}% ${(p[1]-y)/height*100}%`).join(','),
    start:letterIndex*LETTER_SECONDS+partIndex*.12/MOTION_SPEED,duration:1.15/MOTION_SPEED,
    fromX:[-112,85,-64,110,-92,58,-75][partIndex%7],
    fromY:[-166,130,-116,154,-142,121,-100][partIndex%7],
    rotate:[-24,19,15,-17,23,-12,17][seed%7],
    tilt:[31,-27,21,-32,29,-18,25][seed%7],seed};
}));

const clamp=(v,min=0,max=1)=>Math.max(min,Math.min(max,v));
const ease=v=>1-Math.pow(1-v,3);
export function letterState(seconds,letter,{staticFrame=false}={}){
  if(staticFrame)return {opacity:1,x:0,y:0};
  const reveal=clamp((seconds-letter.arrivalEnd)/(.18/MOTION_SPEED));
  const floating=ease(clamp((seconds-letter.arrivalEnd)/(.55/MOTION_SPEED)));
  const hold=1-clamp((seconds-15.1/MOTION_SPEED)/(1.4/MOTION_SPEED));
  return {opacity:reveal*reveal*(3-2*reveal),
    x:Math.sin(seconds*MOTION_SPEED*1.45+letter.letterIndex*.83)*1.7*floating*hold,
    y:Math.cos(seconds*MOTION_SPEED*1.65+letter.letterIndex*.7)*3.1*floating*hold};
}
export function pieceState(seconds,piece,{staticFrame=false}={}){
  if(staticFrame)return {opacity:0,x:0,y:0,z:0,rotate:0,tilt:0,scale:1,shadow:0};
  const progress=clamp((seconds-piece.start)/piece.duration);
  const arrive=ease(progress), remaining=1-arrive;
  const fade=clamp(progress/.62);
  const whole=letterState(seconds,letters[piece.letterIndex]);
  // The complete original glyph fills behind the arriving pieces. Once that
  // backing is opaque the fragments disappear, preserving every outer curve
  // and counter without shrinking or opening seams in the settled letter.
  const opacity=whole.opacity===1?0:fade*fade*(3-2*fade);
  return {opacity,
    x:piece.fromX*remaining+Math.sin(progress*Math.PI)*24*(piece.seed%2?1:-1)+whole.x,
    y:piece.fromY*remaining-Math.sin(progress*Math.PI)*30+whole.y,
    z:92*remaining,
    rotate:piece.rotate*remaining,
    tilt:piece.tilt*remaining,
    scale:1+.14*remaining,
    shadow:(8+remaining*20)*(1-whole.opacity)};
}

export function activeLetter(seconds){
  return seconds>=14.7/MOTION_SPEED?'complete':definitions[Math.min(6,Math.floor(seconds/LETTER_SECONDS))][0];
}
