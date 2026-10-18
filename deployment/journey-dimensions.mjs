import pageDates from '../config/page-dates.json' with {type: 'json'};
import {journeyPageKey} from '../src/journey-page-key.mjs';

export const journeyPages = new Set(['home', 'pricing', 'service', 'county', 'work', 'contact', 'request', 'other', 'guide', 'guide_index', 'service_new', 'service_redesign', 'service_seo', 'service_care', 'service_audit', 'service_contractors', 'areas', 'work_demo', ...Object.keys(pageDates).map(journeyPageKey)]);
export const journeySources = new Set(['not_recorded', 'direct', 'google', 'bing', 'ai_assistant', 'social', 'referral', 'campaign', 'internal']);
