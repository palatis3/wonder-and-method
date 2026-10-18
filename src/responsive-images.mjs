import images from './assets/responsive-images.json' with {type:'json'};
import {escapeHtml as e} from './shared.mjs';
export function responsiveImageAttributes(path,sizes='(max-width:767px) calc(100vw - 40px), 620px'){
 const image=images[path];
 if(!image)return '';
 return `width="${image.width}" height="${image.height}" srcset="${image.variants.map(v=>`${v.path} ${v.width}w`).join(', ')}" sizes="${e(sizes)}"`;
}
