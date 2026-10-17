-- Preserve the existing aggregate history while extending the fixed enums.
CREATE TABLE journey_counts_extended (
 day TEXT NOT NULL,
 event TEXT NOT NULL CHECK(event IN ('page_view','offer_select','question_select','contact_select','request_start','question_start','inquiry_saved','question_saved')),
 service TEXT NOT NULL CHECK(service IN ('launch_site','focused_site','signature_site','keep_running','improve','grow','website_baseline','audit_fix_sprint','unsure')),
 page TEXT NOT NULL CHECK(page IN ('home','pricing','service','county','work','contact','request','other','guide','guide_index','service_new','service_redesign','service_seo','service_care','service_audit','service_contractors','areas','work_demo')),
 total INTEGER NOT NULL CHECK(total >= 0 AND total <= 1000000),
 PRIMARY KEY(day,event,service,page)
) WITHOUT ROWID;
INSERT INTO journey_counts_extended SELECT day,event,service,page,total FROM journey_counts;
DROP TABLE journey_counts;
ALTER TABLE journey_counts_extended RENAME TO journey_counts;
