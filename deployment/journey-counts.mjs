const events=new Set(['page_view','offer_select','question_select','contact_select','request_start','question_start','inquiry_saved','question_saved']);
const services=new Set(['launch_site','focused_site','signature_site','keep_running','improve','grow','website_baseline','audit_fix_sprint','unsure']);
const pages=new Set(['home','pricing','service','county','work','contact','request','other','guide','guide_index','service_new','service_redesign','service_seo','service_care','service_audit','service_contractors','areas','work_demo']);
export const journeyRetentionDays=90;
const reply=status=>new Response(null,{status,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}});
export async function saveJourneyCount(request,env,{readLimited,fingerprint,now=Date.now()}){
 if(env.JOURNEY_COUNTS!=='aggregate'||env.ENVIRONMENT!=='production'||env.RELEASE_APPROVED!=='true'||env.INQUIRY_MODE!=='live')return reply(404);
 if(request.method!=='POST')return reply(405);
 if(request.headers.get('Origin')!==new URL(request.url).origin||request.headers.get('Sec-Fetch-Site')==='cross-site')return reply(403);
 if(request.headers.get('Sec-GPC')==='1'||request.headers.get('DNT')==='1')return reply(204);
 if(!env.DB||!env.FINGERPRINT_SECRET||env.FINGERPRINT_SECRET.length<32)return reply(503);
 if(request.headers.get('Content-Type')?.split(';')[0]!=='application/json')return reply(415);
 let data;try{data=JSON.parse(await readLimited(request.body,512));}catch{return reply(400);}
 if(!data||typeof data!=='object'||Array.isArray(data)||Object.keys(data).sort().join(',')!=='event,page,service'||!events.has(data.event)||!services.has(data.service)||!pages.has(data.page))return reply(400);
 // Distinct short-lived rate key; never stored with aggregate events.
 const key=await fingerprint(env.FINGERPRINT_SECRET,`journey-rate:${request.headers.get('CF-Connecting-IP')||'unknown'}:${Math.floor(now/600000)}`);
 const allowed=await env.DB.prepare('INSERT INTO rate_limits (key,hits,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET hits=hits+1 WHERE hits<60 RETURNING hits').bind(key,now+1200000).first();
 if(!allowed)return reply(429);
 const day=new Date(now).toISOString().slice(0,10);
 await env.DB.prepare('INSERT INTO journey_counts (day,event,service,page,total) VALUES (?,?,?,?,1) ON CONFLICT(day,event,service,page) DO UPDATE SET total=MIN(total+1,1000000)').bind(day,data.event,data.service,data.page).run();
 return reply(204);
}
export async function cleanJourneyCounts(db,now=Date.now()){
 if(!await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='journey_counts'").first())return;
 const before=new Date(now-(journeyRetentionDays-1)*86400000).toISOString().slice(0,10);
 await db.prepare('DELETE FROM journey_counts WHERE day < ?').bind(before).run();
}
