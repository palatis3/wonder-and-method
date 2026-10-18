import {routeIndexEligible} from './index-policy.mjs';

export function socialCardPath(path) {
  if (!routeIndexEligible(path) && !/^\/work\/(?:fieldwork|northline|hearthside)\//.test(path)) return null;
  return '/assets/social/' + (path === '/' ? 'home' : path.slice(1, -1).replaceAll('/', '-')) + '.png';
}
