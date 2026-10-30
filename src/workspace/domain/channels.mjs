// Platform enablement is verified on the server, never inferred from this list.
export const AD_CHANNELS = Object.freeze([
  {id:'google_ads',name:'Google Ads',placements:['Google Search'],service:'ads_search',creative:'Search terms, keywords, responsive text ads and landing pages',setup:['Google Cloud project','Ads API access','OAuth authorization','Customer-owned Google Ads account']},
  {id:'meta_ads',name:'Facebook & Instagram',placements:['Facebook','Instagram'],service:'ads_social',creative:'Images, video, copy, audience, placements and landing pages',setup:['Meta business portfolio','Ad account','Facebook Page and Instagram identity as needed','Meta developer app and Marketing API permissions']},
  {id:'microsoft_ads',name:'Microsoft / Bing Ads',placements:['Microsoft Search'],service:'ads_search',creative:'Search terms, keywords, text ads and landing pages',setup:['Microsoft Advertising account','Developer token','Registered OAuth application','Customer and account authorization']},
  {id:'tiktok_ads',name:'TikTok Ads',placements:['TikTok'],service:'ads_social',creative:'Vertical video, rights, copy, audience and landing pages',setup:['TikTok Business Center','Advertiser account','API for Business app','Advertiser authorization']},
  {id:'linkedin_ads',name:'LinkedIn Ads',placements:['LinkedIn'],service:'ads_professional',creative:'Professional targeting, image/video creative, copy and landing pages',setup:['LinkedIn Page','Campaign Manager account','Developer app','Advertising API access']},
]);
export const adChannel=id=>AD_CHANNELS.find(c=>c.id===id);
export const AD_ACTIONS=Object.freeze(['create','update','enable','pause']);
export function adOperation(provider,action){
  if(!adChannel(provider)||!AD_ACTIONS.includes(action))throw new Error('Unsupported advertising action');
  return `${provider.replace(/_ads$/,'')}_${action}`;
}
export function campaignResource(provider,account,id){
  if(!adChannel(provider)||!/^\d+$/.test(account)||!/^\d+$/.test(id))throw new Error('Invalid campaign identity');
  return `${provider==='google_ads'?'customers':provider.replace(/_ads$/,'')}/${account}/campaigns/${id}`;
}
export function splitCampaignResource(provider,account,resource){
  const prefix=campaignResource(provider,account,'0').slice(0,-1);
  if(typeof resource!=='string'||!resource.startsWith(prefix)||!/^\d+$/.test(resource.slice(prefix.length)))throw new Error('Campaign belongs to a different account or provider');
  return resource.slice(prefix.length);
}
