import {privateRoute} from './index-policy.mjs';
const brandedFallbacks=new Set(['/services/brand-messaging/','/services/ecommerce-websites/','/services/local-business-profiles/','/services/workflow-automation/','/services/custom-systems/','/checkout/business-site/','/checkout/local-focus/','/checkout/brand-message/','/checkout/storefront/','/checkout/local-presence/','/checkout/workflow/','/checkout/systems/']);

export function socialCardPath(path) {
  // Public forms and demonstrations still need accurate previews when shared.
  if (privateRoute(path)) return null;
  if(brandedFallbacks.has(path))return '/assets/brand/social-card.png';
  return '/assets/social/' + (path === '/' ? 'home' : path.slice(1, -1).replaceAll('/', '-')) + '.png';
}
