// One shared identity for current website pages. Article imagery stays editorial.
export const brand={
  emblem:'/assets/brand/emblem.svg',
  logo:'/assets/brand/logo-square.png',
  social:'/assets/brand/social-card.png',
  socialAlt:'Wonder & Method brush emblem and wordmark. Distinctive websites.',
  socialWidth:1200,
  socialHeight:630
};
export const brandWordmark=()=>`<img class="brand-emblem" src="${brand.emblem}" width="28" height="22" alt="" aria-hidden="true"><span class="brand-name">Wonder &amp; Method</span>`;
// Keep the stable, >48px PNG as the last general icon declaration. Google's
// documented Search favicon formats include PNG and ICO, but not SVG.
export const brandIcons=()=>'<link rel="icon" href="/favicon.ico" sizes="16x16 32x32 48x48" type="image/vnd.microsoft.icon"><link rel="icon" href="/assets/brand/favicon-96.png" sizes="96x96" type="image/png"><link rel="apple-touch-icon" href="/assets/brand/apple-touch-icon.png" sizes="180x180">';
