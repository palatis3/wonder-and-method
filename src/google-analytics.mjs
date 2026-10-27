import {privateRoute} from './index-policy.mjs';
import {escapeHtml as e} from './shared.mjs';

export function googleAnalyticsEnabled(config){
 return config.mode==='production'&&config.formMode==='live'&&!config.reviewOnly&&config.googleAnalytics?.enabled===true;
}
export function googleAnalyticsPage(config,path){
 return googleAnalyticsEnabled(config)&&!privateRoute(path)&&!/^\/work\/[^/]+\/request\/$/.test(path);
}
export function analyticsContentGroup(path){
 if(path==='/')return 'home';
 if(path==='/contact/'||path.startsWith('/checkout/'))return 'inquiry';
 if(path==='/pricing/')return 'pricing';
 if(path.startsWith('/guides/'))return path==='/guides/'?'guide_directory':'guide';
 if(path.startsWith('/areas/'))return path==='/areas/erie-county/'||/^\/areas\/[^/]+\/[^/]+\/$/.test(path)?'county_service':'area_directory';
 if(path.startsWith('/services/'))return 'service';
 if(path.startsWith('/work/'))return 'work';
 if(path.startsWith('/tools/'))return 'tool';
 return 'information';
}
export function analyticsChoiceMarkup(config,path){
 if(!googleAnalyticsPage(config,path))return '';
 return `<section class="analytics-choice" data-analytics-choice data-measurement-id="${e(config.googleAnalytics.measurementId)}" data-content-group="${analyticsContentGroup(path)}" aria-labelledby="analytics-choice-title" hidden><h2 id="analytics-choice-title">Optional analytics</h2><p data-analytics-description>Allow Google Analytics cookies to measure visits and actions? Form answers are excluded. <a href="/privacy/#cookies-and-counts">Privacy details</a>.</p><div class="analytics-choice-actions"><button type="button" data-analytics-accept>Allow analytics</button><button type="button" data-analytics-decline>No thanks</button><button type="button" data-analytics-close hidden>Close</button></div></section>`;
}
