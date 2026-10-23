// Small original line drawings used by the studio's navigation and choice cards.
const paths={
 studio:'<path d="M5 21V9l7-5 7 5v12M9 21v-7h6v7M3 21h18"/><path d="M9 9h6"/>',
 services:'<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M8 7.5h.01M11 7.5h.01M8 14h4M8 17h8"/>',
 areas:'<path d="M12 21s7-6 7-12a7 7 0 0 0-14 0c0 6 7 12 7 12Z"/><circle cx="12" cy="9" r="2.5"/>',
 information:'<path d="M6 3h8l4 4v14H6Z M14 3v5h4M9 12h6M9 16h6"/>',
 search:'<circle cx="10" cy="10" r="6"/><path d="m14.5 14.5 6 6M10 7v6M7 10h6"/>',
 care:'<path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6Z"/><path d="m8 12 3 3 5-6"/>',
 spark:'<path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5Z"/>'
};
export function studioIcon(name,className=''){
 if(!Object.hasOwn(paths,name))throw Error('Unknown studio icon: '+name);
 return `<svg${className?` class="${className}"`:''} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths[name]}</svg>`;
}
