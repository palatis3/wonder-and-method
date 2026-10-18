import { isIP } from 'node:net';

export function inquiryNetwork(ip){
  if(isIP(ip)===4)return ip;
  if(isIP(ip)!==6)return 'unknown';
  // URL normalizes IPv4-mapped and compressed spellings before /64 grouping.
  const canonical=new URL(`http://[${ip}]/`).hostname.slice(1,-1);
  const halves=canonical.split('::'),left=halves[0]?halves[0].split(':'):[],right=halves[1]?halves[1].split(':'):[];
  const parts=halves.length===2?[...left,...Array(8-left.length-right.length).fill('0'),...right]:left;
  const words=parts.map(part=>parseInt(part,16));
  if(words.slice(0,5).every(word=>word===0)&&words[5]===65535)return [words[6]>>8,words[6]&255,words[7]>>8,words[7]&255].join('.');
  return words.slice(0,4).map(word=>word.toString(16)).join(':')+'::/64';
}

export async function allowInquiryRate(env,ip,now,fingerprint){
  const network=inquiryNetwork(ip);
  for(const [period,limit] of [[3600_000,3],[86400_000,10]]){
    const bucket=Math.floor(now/period);
    const key=await fingerprint(env.FINGERPRINT_SECRET,`inquiry:${network}:${period}:${bucket}`);
    const row=await env.DB.prepare('INSERT INTO rate_limits (key,hits,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET hits=hits+1 WHERE hits<? RETURNING hits')
      .bind(key,(bucket+2)*period,limit).first();
    if(!row)return {allowed:false,retryAfter:Math.max(1,Math.ceil(((bucket+1)*period-now)/1000))};
  }
  return {allowed:true};
}
