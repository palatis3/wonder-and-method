-- Prospective aggregate history only. Do not copy or reconstruct daily history.
-- The Worker writes both periods in one D1 transaction after this migration.
CREATE TABLE journey_monthly_counts (
 month TEXT NOT NULL CHECK(length(month)=7 AND month GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]' AND substr(month,6,2) BETWEEN '01' AND '12'),
 event TEXT NOT NULL CHECK(event IN ('page_view','offer_select','question_select','contact_select','request_start','question_start','inquiry_saved','question_saved','email_click','chat_open','resource_select','goal_new_website','goal_redesign','goal_fix','goal_search','goal_care')),
 service TEXT NOT NULL CHECK(service IN ('launch_site','focused_site','signature_site','keep_running','improve','grow','website_baseline','audit_fix_sprint','unsure')),
 page TEXT NOT NULL CHECK(length(page) BETWEEN 1 AND 120 AND page NOT GLOB '*[^a-z0-9_]*'),
 source TEXT NOT NULL CHECK(source IN ('not_recorded','direct','google','bing','search','ai_assistant','social','referral','campaign','internal')),
 total INTEGER NOT NULL CHECK(typeof(total)='integer' AND total BETWEEN 1 AND 31000000),
 PRIMARY KEY(month,event,service,page,source)
);
CREATE TABLE journey_monthly_state (
 id INTEGER PRIMARY KEY CHECK(id=1),
 first_recorded_at INTEGER NOT NULL CHECK(first_recorded_at>0)
);
