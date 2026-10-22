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
 {id:'maryland',name:'Maryland',abbreviation:'MD'}
].map(state=>({...state,path:`/areas/${state.id}/`,areaPlural:state.id==='connecticut'?'planning regions':state.id==='maryland'?'service areas':'counties'}));
