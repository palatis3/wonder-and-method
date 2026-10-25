import {privateRoute} from './index-policy.mjs';

export function socialCardPath(path) {
  // Public forms and demonstrations still need accurate previews when shared.
  if (privateRoute(path)) return null;
  return '/assets/social/' + (path === '/' ? 'home' : path.slice(1, -1).replaceAll('/', '-')) + '.png';
}
