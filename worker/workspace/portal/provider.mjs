import {WorkspaceError,canonical} from '../../../src/workspace/domain/contracts.mjs';
import {stripeRequest,verifyStripeAccount,STRIPE_VERSION} from '../billing/stripe.mjs';
import {byteDigest} from '../continuity/envelope.mjs';
export const PORTAL_KIND='billing_portal_create';
export const fail=()=>{throw new WorkspaceError('portal_unconfirmed','Billing portal access needs verification.',503);};
export const digest=value=>byteDigest(new TextEncoder().encode(canonical(value)));
export function contextMatches(env,c){
 if(env.BILLING_PORTAL_ENABLED!=='true'||env.PORTAL_KERNEL_VERSION!=='portal-v1'||env.PORTAL_IDEMPOTENCY_QUALIFIED!=='true'||env.STRIPE_API_VERSION!==STRIPE_VERSION||c.api_version!==STRIPE_VERSION||c.account_id!==env.STRIPE_ACCOUNT_ID||c.environment!==env.STRIPE_MODE||!env.STRIPE_SANDBOX_ID||c.sandbox_id!==env.STRIPE_SANDBOX_ID||c.return_url!==env.PORTAL_RETURN_URL)fail();
 let u;try{u=new URL(c.return_url);}catch{fail();}if(u.protocol!=='https:'||u.username||u.password||u.hash)fail();
 if(!/^cus_[A-Za-z0-9]+$/.test(c.customer_id)||!/^bpc_[A-Za-z0-9]+$/.test(c.configuration_id)||!c.policy_version)fail();
}
export async function restrictedConfiguration(value,c){
 if(value?.object!=='billing_portal.configuration'||value.id!==c.configuration_id||value.active!==true||value.is_default!==false||value.livemode!==(c.environment==='live')||value.default_return_url!==c.return_url||value.metadata?.policy_version!==c.policy_version||value.login_page?.enabled!==false||value.login_page.url!==null)fail();
 const expected={invoice_history:true,payment_method_update:true,customer_update:false,subscription_update:false,subscription_cancel:false,subscription_pause:false};
 if(!value.features||Object.keys(value.features).sort().join(',')!==Object.keys(expected).sort().join(','))fail();
 for(const [name,enabled]of Object.entries(expected))if(value.features[name]?.enabled!==enabled)fail();
 // Fingerprint all effective nested feature data, including payment-method configuration.
 const fingerprint=await digest({id:value.id,active:value.active,is_default:value.is_default,livemode:value.livemode,application:value.application??null,default_return_url:value.default_return_url,features:value.features,login_page:value.login_page,policy_version:value.metadata.policy_version});
 if(c.configuration_digest&&fingerprint!==c.configuration_digest)fail();return fingerprint;
}
export async function verifyPortalConfiguration(env,c,{fetcher=fetch}={}){
 contextMatches(env,c);await verifyStripeAccount(env,fetcher);
 const customer=await stripeRequest(env,'/v1/customers/'+c.customer_id,{fetcher});
 if(customer.id!==c.customer_id||customer.object!=='customer'||customer.deleted||customer.livemode!==(c.environment==='live'))fail();
 const value=await stripeRequest(env,'/v1/billing_portal/configurations/'+c.configuration_id,{fetcher});return restrictedConfiguration(value,c);
}
export function portalUrl(value){
 if(typeof value!=='string'||value.length>4096)fail();let u;try{u=new URL(value);}catch{fail();}
 if(u.origin!=='https://billing.stripe.com'||!u.pathname.startsWith('/p/session/')&&!u.pathname.startsWith('/p/session?')&&u.pathname!=='/p/session'||u.username||u.password||u.hash)fail();return value;
}
export function sessionProof(value,c,attempt,now=Date.now()){
 if(value?.object!=='billing_portal.session'||!/^bps_[A-Za-z0-9]+$/.test(value.id)||value.customer!==c.customer_id||value.configuration!==c.configuration_id||value.livemode!==(c.environment==='live')||value.return_url!==c.return_url||value.flow!=null||value.on_behalf_of!=null||value.after_expiration!=null||value.customer_account!=null||!Number.isSafeInteger(value.created)||value.created*1000>now+60000||value.created*1000<new Date(attempt.started_at).getTime()-60000)fail();
 return {settled:true,readback_matches:true,evidence_reference:'stripe:'+value.id,provider_reference:value.id,observed_at:new Date(now).toISOString(),customer_id:c.customer_id,configuration_id:c.configuration_id,configuration_digest:c.configuration_digest,account_id:c.account_id,environment:c.environment,sandbox_id:c.sandbox_id,request_id:c.request_id,created:value.created};
}
export async function createPortalSession(env,c,attempt,operation,{fetcher=fetch}={}){
 contextMatches(env,c);
 return stripeRequest(env,'/v1/billing_portal/sessions',{method:'POST',fetcher,key:`wm:portal:${operation.id}:${attempt.dispatch_nonce}`,fields:{customer:c.customer_id,configuration:c.configuration_id,return_url:c.return_url}});
}
