import {parse} from 'parse5';

// Count browser resource attributes, not navigation destinations or data-only
// motion inputs. Keep every eager responsive candidate conservative.
export function initialRouteAssets(html){
 const assets=new Set();
 const attributes=node=>Object.fromEntries((node.attrs||[]).map(({name,value})=>[name,value]));
 const add=value=>{if(/^\/(?:assets\/|favicon\.ico(?:[?#]|$))/.test(value))assets.add(value.split(/[?#]/)[0]);};
 function walk(node,deferredPicture=false){
  const attrs=attributes(node);
  if(node.tagName==='img'&&attrs.loading?.toLowerCase()==='lazy')return;
  if(node.tagName==='source'&&deferredPicture)return;
  const lazyPicture=node.tagName==='picture'&&node.childNodes?.some(child=>child.tagName==='img'&&attributes(child).loading?.toLowerCase()==='lazy');
  if(['img','source','video','audio','script','link','input','iframe'].includes(node.tagName)){
   const fetchLink=node.tagName!=='link'||/(?:^|\s)(?:stylesheet|preload|modulepreload|icon|apple-touch-icon)(?:\s|$)/.test((attrs.rel||'').toLowerCase());
   if(fetchLink){
    for(const name of ['src','href','poster'])if(attrs[name])add(attrs[name]);
    for(const name of ['srcset','imagesrcset'])for(const match of (attrs[name]||'').matchAll(/(\/assets\/[^\s,]+)(?:\s+\d+(?:\.\d+)?[wx])?/g))add(match[1]);
   }
  }
  for(const child of node.childNodes||[])walk(child,lazyPicture);
 }
 walk(parse(html));return assets;
}

export function deferredMotionImages(html){
 const assets=new Set();
 function walk(node){
  for(const {name,value} of node.attrs||[]){
   if(!['data-desktop-poster','data-mobile-poster','data-city-preview-src','data-city-preview-srcset'].includes(name))continue;
   for(const match of value.matchAll(/(\/assets\/[^\s,]+)(?:\s+\d+(?:\.\d+)?[wx])?/g))assets.add(match[1].split(/[?#]/)[0]);
  }
  for(const child of node.childNodes||[])walk(child);
 }
 walk(parse(html));return assets;
}
