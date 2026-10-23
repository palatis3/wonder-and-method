import data from './location-service-data.json' with {type:'json'};

// Only individually reviewed commercial briefs belong here. Directory entries
// remain useful, stable destinations whether or not a commercial brief exists.
export const locationServices=data;
const byPath=new Map(data.map(entry=>[entry.path,entry]));
const byArea=new Map(data.flatMap(entry=>entry.areaIds.map(id=>[id,entry])));
export const locationServiceForPath=path=>byPath.get(path)||null;
export const locationServiceForArea=id=>byArea.get(id)||null;
