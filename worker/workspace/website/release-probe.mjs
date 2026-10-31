// Include in a client Worker before hashing/uploading its final build output.
// The handler must run before cached/static assets and preserve the same route.
export function releaseProbe(request,env){
 if(new URL(request.url).pathname!=='/__wm_release')return null;
 const nonce=new URL(request.url).searchParams.get('nonce');
 if(request.method!=='GET'||!nonce||nonce.length>80)return new Response(null,{status:400});
 return Response.json({version_id:env.CF_VERSION_METADATA?.id,release_marker:env.WM_RELEASE_MARKER,nonce},{headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}
