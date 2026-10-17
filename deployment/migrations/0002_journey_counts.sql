CREATE TABLE IF NOT EXISTS journey_counts (
 day TEXT NOT NULL,
 event TEXT NOT NULL CHECK(event IN ('page_view','offer_select','question_select','request_start','question_start','inquiry_saved','question_saved')),
 service TEXT NOT NULL CHECK(service IN ('launch_site','focused_site','signature_site','keep_running','improve','grow','website_baseline','audit_fix_sprint','unsure')),
 page TEXT NOT NULL CHECK(page IN ('home','pricing','service','county','work','contact','request','other')),
 total INTEGER NOT NULL CHECK(total >= 0 AND total <= 1000000),
 PRIMARY KEY(day,event,service,page)
) WITHOUT ROWID;
