export class IndependentBucket{
 data=new Map();
 async get(key){const bytes=this.data.get(key);return bytes?{size:bytes.length,body:new Response(bytes).body}:null;}
 async put(key,body,{onlyIf}={}){if(onlyIf instanceof Headers&&this.data.has(key))return null;const bytes=typeof body==='string'?new TextEncoder().encode(body):new Uint8Array(body);this.data.set(key,bytes.slice());return {};}
}
export const independentEnvironment=()=>({RECOVERY_BYTES:new IndependentBucket(),BACKUP_KEYS:JSON.stringify({synthetic:btoa(String.fromCharCode(...new Uint8Array(32).fill(17)))}),BACKUP_KEY_ID:'synthetic'});
