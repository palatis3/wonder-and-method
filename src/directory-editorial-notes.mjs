// Reader-facing descriptions of the existing records. This module neither
// changes geography nor represents a new verification of an external source.
export function directorySourceLabel(url,context,state){
 const u=new URL(url),path=decodeURIComponent(u.pathname),file=path.split('/').filter(Boolean).at(-1)||'';
 if(/\/guidestloc\/[a-z]{2}_gslcg\.pdf$/i.test(path))return `${state.name}: Census geography reference guide (PDF)`;
 if(/co-est(\d{4})-alldata\.csv/.test(file))return `U.S. Census: ${file.match(/est(\d{4})/)[1]} county population estimates (CSV)`;
 if(/sub-est(\d{4})/.test(file))return `${state.name}: ${file.match(/est(\d{4})/)[1]} place and subdivision population estimates (CSV)`;
 if(/prm-est(\d{4})-pop\.xlsx/.test(file))return `Puerto Rico: ${file.match(/est(\d{4})/)[1]} municipio population estimates (spreadsheet)`;
 if(u.hostname==='tigerweb.geo.census.gov'&&path.includes('/Census2020/')&&file==='query')return `${state.name}: 2020 Census place records (data query)`;
 if(u.hostname.replace(/^www\./,'')==='stats.indiana.edu'&&/^e2025[-_]places.asp$/.test(file))return 'Indiana: 2025 place population estimates';
 if(u.hostname.replace(/^www\./,'')==='stats.indiana.edu'&&/^e2025[-_]townships.asp$/.test(file))return 'Indiana: 2025 township population estimates';
 if(u.hostname==='kygisportalservices.ky.gov'&&path.includes('CityLimitsMap'))return 'Kentucky: city-limits geography layer';
 if(u.hostname==='web.sos.ky.gov'&&path.includes('/monterey/'))return 'Monterey: Kentucky dissolution order (PDF)';
 if(u.hostname==='web.sos.ky.gov'&&file==='cities.aspx'&&u.searchParams.get('id')==='270')return 'Monterey: Kentucky Secretary of State city-status record';
 if(u.hostname==='legislature.maine.gov'&&file==='ListDistrictTowns')return 'Maine House: towns and counties by district';
 if(u.hostname==='legislature.maine.gov'&&file==='10782')return 'Maine Legislature: Drew deorganization record';
 if(u.hostname==='msa.maryland.gov')return path.includes('/01glance/')?(file==='munic.html'?'Maryland State Archives: municipality reference list':'Maryland State Archives: municipal-government overview'):`Maryland State Archives: ${context} local-government reference`;
 if(u.hostname==='maps.nj.gov'&&path.includes('/Government_Boundaries/'))return 'New Jersey: municipal government-boundary layer';
 if(u.hostname==='pub.njleg.gov'&&path.includes('/AL23/287'))return 'New Jersey: P.L. 2023, chapter 287 (municipal legislation)';
 if(u.hostname==='www.nheconomy.com'&&file==='municipality-county-region.csv')return 'New Hampshire: municipality, county and region list (CSV)';
 if(u.hostname==='legislature.vermont.gov'&&path.includes('/24APPENDIX/126/00001'))return 'Vermont statutes: municipal charter provision for the Caledonia County reference';
 if(u.hostname==='tnmap.tn.gov'&&path.includes('COUNTY_BOUNDARIES_AND_CITY_BOUNDARIES'))return 'Tennessee: county and city boundary map service';
 if(u.hostname==='www.sco.wisc.edu'&&path.includes('qmcdq'))return 'Wisconsin State Cartographer: what “MCD” (minor civil division) means';
 if(state.id==='michigan'){
  if(path.includes('72bced2da68446e68a8a27abf25d6ff8'))return 'Michigan: municipal-boundary dataset metadata';
  if(path.includes('/MinorCivilDivision/'))return 'Michigan: township and municipal subdivision records';
  if(path.includes('/Village/'))return 'Michigan: village boundary records';
  if(path.includes('1c8a7a_6df40baaca554549b9b450b0f7bbc2f7'))return 'Howard Township: 2026 meeting minutes, first cited record (PDF)';
  if(path.includes('1c8a7a_1440f04acc904860810654d2fa082a7d'))return 'Howard Township: 2026 meeting minutes, second cited record (PDF)';
 }
 if(state.id==='new-york'){
  if(u.hostname.includes('rocklandcountyny.gov')&&/638302849437900000/.test(url))return 'Rockland County: municipal geography reference';
  if(u.hostname.includes('tuxedogov.org')&&/1pt0144/.test(url))return 'Tuxedo: summary of consolidation status (PDF)';
 }
 if(/^(?:[a-f\d]{12,}|\d+)(?:\.pdf)?$/i.test(file))return `${context}: government record (${u.hostname.replace(/^www\./,'')})`;
 return null;
}

export function directoryReadableNote(note,state){
 let text=(note||'').replace('All 157 incorporated municipalities and Census-designated places use','All 157 incorporated municipalities, along with the Census-designated places, use')
  .replace(/(?:full|complete) 2026 GRFC (?:membership relationships|memberships)/g,`2026 place-to-${state.id==='puerto-rico'?'municipio':'county'} relationship records`)
  .replace(/\bGRFC\b/g,'geographic relationship records').replace(/\bACS26\b/g,'January 2026 Census').replace(/\bGEOID\b/g,'Census geographic identifier')
  .replace(/Representative-place population ranking is incomplete because one or more incorporated county memberships lack a matching 2025 estimate\.?\s*/g,'')
  .replace('Fictitious Census city/village subdivision equivalents are excluded.','Duplicate Census subdivision representations of cities and villages are excluded.')
  .replace('the fictitious New Orleans subdivision is excluded while the actual city is retained.','the duplicate Census subdivision for New Orleans is excluded while the actual city is retained.')
  .replace('Cross-county municipalities are listed in each county they touch:','Municipalities shared with another county:');
 if(state.id==='puerto-rico')text=text.replace(/Cross-county places appear in each intersected county or municipio\./g,'Places spanning municipio boundaries appear in each relevant municipio.');
 else text=text.replace(/each intersected county or municipio/g,'each intersected county');
 const hasTownships=state.counties.some(c=>(state.geography[c.slug].municipalityDetails||[]).some(p=>/township/i.test(p.type))||(state.geography[c.slug].administrativeDistricts||[]).some(p=>/township/i.test(p.type)));
 if(!hasTownships)text=text.replace('Incorporated municipalities, organized townships, consolidated governments','Incorporated municipalities, consolidated governments');
 if(state.id==='kentucky')text=text.replace('The Kentucky DLG final dissolution order','The Monterey final dissolution order from Kentucky DLG');
 if(state.id==='hawaii')text=text.replace('Kalawao County is a distinct Census county, dependent on Hawaii state government (G/H4), administered by the Department of Health.','Kalawao County is a distinct Census county, dependent on Hawaii state government and administered by the Department of Health. Its Census government classification is G/H4.');
 if(state.id==='new-york')text=text.replace('Town and village names can overlap, and some villages cross county lines.','Town and village names can overlap; some villages cross county lines. Communities are listed separately from municipalities.').replace('Town and village names can overlap. Communities are listed separately from municipalities; use the actual address when a boundary matters.','Town and village names can overlap; some villages cross county lines. Communities are listed separately from municipalities.');
 if(state.id==='north-carolina')text=text.replace('Spencer Mountain has a suspended charter through June 30, 2029; neither is counted as an active municipal government. The charter remains suspended until June 30, 2029 under S.L. 2026-50 section 6.2.','Spencer Mountain’s charter is suspended through June 30, 2029 under S.L. 2026-50 section 6.2; neither it nor Dellview is counted as an active municipal government.').replace('The statutory charter suspension expired June 30, 2024.','Eureka’s statutory charter suspension expired June 30, 2024.');
 return text.trim();
}

export const directorySentences=text=>(text||'').replace(/\b(?:U\.S|S\.L)\./g,abbreviation=>abbreviation.replace(/\./g,'\uE000')).split(/(?<=\.) (?=[A-Z“])/).map(sentence=>sentence.replace(/\uE000/g,'.')).filter(Boolean);
export const sharedDirectoryDefinition=sentence=>/^(?:January |Place list |Municipal names were checked|Town and village names|Communities are |Community (?:entries|lists)|Hawaii has no |Honolulu city and county |Cross-county places |Places (?:spanning|crossing)|Statistical |This (?:inventory|January inventory)|Tribal-named |Historical geography|CDPs |Census county divisions |Incorporated (?:municipalities|places|cities)|Home-rule names|Selected communities|These (?:lists|names help)|Alaska census areas |Census subareas |Borough-level governments )/.test(sentence);
export const directoryTechnicalSentence=text=>/ranking|ranked|hierarchy|GEOID|geographic identifier|class code|functional status [A-Z]|[A-Z]\/[A-Z]?\d|normaliz|retriev|record-equivalent|suffix|must not be added together|original Census place label/i.test(text);

export function directoryLocalNote(note,state){
 let text=note||'';
 if(state.id==='connecticut')text=text.replace(/^[^.]+ is one of Connecticut’s nine current Census county-equivalent planning regions\.\s*/,'').replace('Providers confirm their own service coverage and the exact destination when arranging work.','');
 if(['new-york','pennsylvania','ohio'].includes(state.id))text=directorySentences(text).filter(s=>!(/^(?:Use|Confirm|Check|Keep|A city named|A municipality name|The directory|For appointments|When (?:a|the) (?:visit|delivery))/i.test(s)&&/actual|address|destination|pictured project|business location|appointment|collection|delivery|coverage/i.test(s))).join(' ');
 return text.trim();
}

export function directoryPlaceNote(place,state,county){
 const key=state.id+'/'+county.slug+'/'+place.name;
 const specials={
  'kentucky/owen/Monterey':'Former city. Dissolution order signed December 4, 2023 and filed May 20, 2025; the Secretary of State record reports Dissolved.',
  'north-carolina/edgecombe/Speed':'Former town; transition effective July 1, 2026. See the named source note for the county agreement and October 2026 population record.',
  'north-carolina/gaston/Spencer Mountain':'Charter suspended through June 30, 2029; no active municipal government. Suspension is not dissolution.',
  'north-carolina/wayne/Eureka':'Active in the state records: charter suspension ended June 30, 2024; financial control returned August 31, 2024.',
  'michigan/cass/Howard':'Current charter or general-law subtype is unconfirmed after a 2026 disincorporation proposal. Listed as Township; see the status evidence below.'
 };
 if(specials[key])return specials[key];
 if(state.id==='michigan')return (place.note||'').replace('Current local-government charter status supersedes the generic township suffix in Census geography.','').replace(' No Census GEOID assigned here.','');
 if(state.id==='georgia')return (place.note||'').replace('The local government identifies a consolidated government; the original Census place label is retained in the source data.','One consolidated city-county government; the Census place and county records describe overlapping geography.');
 if(state.id==='vermont')return (place.note||'').replace('Incorporated entity retained in Census records with inactive governmental status.','Incorporated entity retained in Census records.');
 return place.note||'';
}

export function directoryAliasNote(note,state){
 return state.id==='michigan'?(note||'').replace('Normalized spelling/abbreviation of source name.','Name variant.').replace('Current local-government charter status supersedes the generic township suffix in Census geography.','Charter status follows local-government records.'):note;
}
