import {escapeHtml} from './shared.mjs';

export function breadcrumbTrail(path,title){
 if(path==='/'||path==='/404/')return [];
 const trail=[{path:'/',name:'Home'}];
 if(path.startsWith('/guides/')&&path!=='/guides/')trail.push({path:'/guides/',name:'Guides'});
 else if(path.startsWith('/areas/')&&path!=='/areas/')trail.push({path:'/areas/',name:'Service areas'});
 else if(path.startsWith('/services/')||path.startsWith('/checkout/'))trail.push({path:'/pricing/',name:'Pricing'});
 else if(path.startsWith('/work/')&&path!=='/work/')trail.push({path:'/work/',name:'Work'});
 const concept=path.match(/^\/work\/(fieldwork|northline|hearthside)\/(.+)\/$/);if(concept)trail.push({path:'/work/'+concept[1]+'/',name:concept[1][0].toUpperCase()+concept[1].slice(1)+' concept'});
 const shortNames={'/work/fieldwork/':'Fieldwork','/work/northline/':'Northline','/work/hearthside/':'Hearthside','/pricing/':'Pricing','/contact/':'Contact','/about/':'About','/process/':'Process','/work/':'Work','/work/lead-workbench/':'Lead workbench','/privacy/':'Privacy','/terms/':'Website terms','/accessibility/':'Accessibility','/guides/':'Guides','/areas/':'Service areas','/services/web-design/':'Web design','/services/website-redesign/':'Website redesign','/services/seo/':'SEO & research','/services/website-care/':'Website care','/services/website-audit/':'Website audit','/services/contractor-websites/':'Contractor websites'};
 const county=path.match(/^\/areas\/([a-z-]+)-county\/$/);
 const name=shortNames[path]||(county?county[1].split('-').map(word=>word[0].toUpperCase()+word.slice(1)).join(' ')+' County':title);
 trail.push({path,name});return trail;
}

export function breadcrumbSchema(trail,origin){
 if(trail.length<2)return null;
 return {'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:trail.map((item,i)=>({'@type':'ListItem',position:i+1,name:item.name,item:origin+item.path}))};
}

export function breadcrumbMarkup(trail){
 if(trail.length<2)return '';
 return `<nav class="breadcrumb" aria-label="Breadcrumb"><ol>${trail.map((item,i)=>`<li>${i?'<span class="breadcrumb-separator" aria-hidden="true">/</span>':''}${i===trail.length-1?`<span aria-current="page">${escapeHtml(item.name)}</span>`:`<a href="${escapeHtml(item.path)}">${escapeHtml(item.name)}</a>`}</li>`).join('')}</ol></nav>`;
}

export const backToTopMarkup=()=>'<nav class="page-tools" aria-label="Page navigation"><a class="back-to-top" href="#page-top" aria-label="Back to top"><span class="back-to-top-icon" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5m-6 6 6-6 6 6"/></svg></span><span>Back to top</span></a></nav>';
