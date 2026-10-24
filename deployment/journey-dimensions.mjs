import pageDates from '../config/page-dates.json' with {type: 'json'};
import {journeyPageKey} from '../src/journey-page-key.mjs';
import {retiredCountyRoutes} from './retired-county-routes.mjs';

// Retiring public URLs must not contract the fixed historical aggregate schema.
export const journeyPages = new Set(['home', 'pricing', 'service', 'county', 'work', 'contact', 'request', 'other', 'guide', 'guide_index', 'service_new', 'service_redesign', 'service_seo', 'service_care', 'service_audit', 'service_contractors', 'areas', 'work_demo', 'work_fieldwork_request', 'work_northline_request', 'work_hearthside_request', ...Object.keys(pageDates).map(journeyPageKey), ...Object.keys(retiredCountyRoutes).map(journeyPageKey)]);
export const journeySources = new Set(['not_recorded', 'direct', 'google', 'bing', 'search', 'ai_assistant', 'social', 'referral', 'campaign', 'internal']);
