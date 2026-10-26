// Shared public names keep the browser finder and server navigation consistent.
export const serviceStateInfo = [
 {id:'new-york',name:'New York',abbreviation:'NY'},
 {id:'pennsylvania',name:'Pennsylvania',abbreviation:'PA'},
 {id:'ohio',name:'Ohio',abbreviation:'OH'},
 {id:'new-jersey',name:'New Jersey',abbreviation:'NJ'},
 {id:'connecticut',name:'Connecticut',abbreviation:'CT'},
 {id:'rhode-island',name:'Rhode Island',abbreviation:'RI'},
 {id:'massachusetts',name:'Massachusetts',abbreviation:'MA'},
 {id:'delaware',name:'Delaware',abbreviation:'DE'},
 {id:'vermont',name:'Vermont',abbreviation:'VT'},
 {id:'new-hampshire',name:'New Hampshire',abbreviation:'NH'},
 {id:'maine',name:'Maine',abbreviation:'ME'},
 {id:'maryland',name:'Maryland',abbreviation:'MD'},
 {id:'virginia',name:'Virginia',abbreviation:'VA'},
 {id:'west-virginia',name:'West Virginia',abbreviation:'WV'},
 {id:'michigan',name:'Michigan',abbreviation:'MI'},
 {id:'district-of-columbia',name:'Washington, DC',abbreviation:'DC',kind:'district',aliases:['District of Columbia','Washington DC','Washington D C','D C']},
 {id:'indiana',name:'Indiana',abbreviation:'IN'},
 {id:'kentucky',name:'Kentucky',abbreviation:'KY'},
 {id:'tennessee',name:'Tennessee',abbreviation:'TN'},
 {id:'north-carolina',name:'North Carolina',abbreviation:'NC'},
 {id:'florida',name:'Florida',abbreviation:'FL'},
 {id:'south-carolina',name:'South Carolina',abbreviation:'SC'},
 {id:'georgia',name:'Georgia',abbreviation:'GA'},
 {id:'mississippi',name:'Mississippi',abbreviation:'MS'},
 {id:'alabama',name:'Alabama',abbreviation:'AL'},
 {id:'wisconsin',name:'Wisconsin',abbreviation:'WI'},
 {id:'illinois',name:'Illinois',abbreviation:'IL'},
 {id:'louisiana',name:'Louisiana',abbreviation:'LA'},
 {id:'arkansas',name:'Arkansas',abbreviation:'AR'},
 {id:'texas',name:'Texas',abbreviation:'TX'},
 {id:'missouri',name:'Missouri',abbreviation:'MO'},
 {id:'iowa',name:'Iowa',abbreviation:'IA'},
 {id:'minnesota',name:'Minnesota',abbreviation:'MN'},
 {id:'oklahoma',name:'Oklahoma',abbreviation:'OK'},
 {id:'kansas',name:'Kansas',abbreviation:'KS'},
 {id:'nebraska',name:'Nebraska',abbreviation:'NE'},
 {id:'north-dakota',name:'North Dakota',abbreviation:'ND'},
 {id:'south-dakota',name:'South Dakota',abbreviation:'SD'},
 {id:'california',name:'California',abbreviation:'CA'},
 {id:'new-mexico',name:'New Mexico',abbreviation:'NM'},
 {id:'arizona',name:'Arizona',abbreviation:'AZ'},
 {id:'oregon',name:'Oregon',abbreviation:'OR'},
 {id:'nevada',name:'Nevada',abbreviation:'NV'},
 {id:'washington',name:'Washington',abbreviation:'WA'},
 {id:'colorado',name:'Colorado',abbreviation:'CO'},
 {id:'utah',name:'Utah',abbreviation:'UT'},
 {id:'puerto-rico',name:'Puerto Rico',abbreviation:'PR',kind:'territory'}
].map(state=>({kind:'state',...state,path:`/areas/${state.id}/`,areaPlural:state.id==='puerto-rico'?'municipios':state.id==='louisiana'?'parishes':state.kind==='district'?'district guide':state.id==='connecticut'?'planning regions':['maryland','virginia','missouri','nevada'].includes(state.id)?'service areas':'counties'}));

export function serviceRegionSummary(regions){
 if(regions.includes('Puerto Rico')){
  const district=regions.some(name=>/^(?:Washington,? DC|District of Columbia)$/i.test(name));
  const count=regions.length-1-(district?1:0);
  return new Intl.ListFormat('en-US',{style:'long',type:'conjunction'}).format([...(count?[`${count} ${count===1?'state':'states'}`]:[]),...(district?['Washington, DC']:[]),'Puerto Rico']);
 }
 const district=regions.some(name=>/^(?:Washington,? DC|District of Columbia)$/i.test(name));
 const count=regions.length-(district?1:0);
 if(district)return (count?`${count} ${count===1?'state':'states'} and `:'')+'Washington, DC';
 return regions.length>3?`${regions.length} states`:new Intl.ListFormat('en-US',{style:'long',type:'conjunction'}).format(regions);
}
export const serviceRegionLabel=serviceRegionSummary(serviceStateInfo.map(state=>state.name));
