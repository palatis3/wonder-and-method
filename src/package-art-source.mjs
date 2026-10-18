// Only values represented by the plan artwork belong in its regeneration guard.
// Legal wording, internal planning, dates and unrelated presentation copy do not.
const pick=(object,keys)=>Object.fromEntries(keys.map(key=>[key,object[key]??null]));
export function packageArtSource(offers){
  return {
    projection:3,
    website:Object.fromEntries(['launch_site','focused_site','signature_site'].map(id=>[id,pick(offers[id],[
      'public_name','public_price','marketing_page_cap','forms','form_limit','creative_assets',
      'external_connection_limit','editing_mode','initial_launch_count','training_minutes',
      'launch_content','search_research','graphic_counts','promotional_graphics'
    ])])),
    monthly:Object.fromEntries(Object.entries(offers.plans).map(([id,plan])=>[id,pick(plan,[
      'public_name','monthly_price','small_change_batches','priorities','research','advisor','annual'
    ])])),
    existing:Object.fromEntries(['baseline','audit_sprint'].map(id=>[id,pick(offers[id],['public_name','one_time_price','page_cap'])]))
  };
}
