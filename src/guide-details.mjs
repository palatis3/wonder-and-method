import {researchGuideDetails} from './research-guides.mjs';
import {longtailGuideDetails} from './longtail-guides.mjs';
// Shared presentation lookup; publication cohorts retain their original route sets.
export const guideDetails={...researchGuideDetails,...longtailGuideDetails};
