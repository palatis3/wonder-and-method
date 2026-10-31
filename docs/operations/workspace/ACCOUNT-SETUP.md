# Account and qualification checklist

Existing accounts should be reused where they have the required scope. This list
does not claim that an uninspected account is absent. Keep credentials out of chat,
repository files, browser telemetry and customer exports.

| Service | Current evidence | Remaining setup or qualification |
| --- | --- | --- |
| Supabase | Production `Wonder and Method` and separate staging projects exist; reviewed migrations are being applied only to staging | Current server credential, approved owner identity/bootstrap, MFA, custom Auth SMTP, Storage behavior and scoped recovery drills |
| Cloudflare | Existing public site/account; separate private Worker source and disabled effect configuration | Private app DNS/routes, private byte/control/witness storage, least-privilege custody separation, retained encryption keys and encrypted off-device copy; trusted website upload/publication qualification |
| Resend | Inbound/outbound/SMTP adapters are implemented; prior protected credential was not usable in earlier qualification | Verified sending and receiving domains, current scoped send/read credentials, separate signed inbound/outbound webhook configuration, Auth SMTP and real delivery/bounce/reconciliation checks |
| Stripe | Protected existing production credential was verified earlier without charging a customer | Exact merchant/customer mapping, restricted versioned customer portal, invoice/tax/refund/dispute checks in approved test mode and current production readiness |
| OpenAI | Approved local key is already saved outside git; all seven helpers were sampled successfully | Retained readiness/evaluation/cost evidence; do not create another key for this task |
| Google | Read-only Analytics/Search Console and ad connection code exists | Authorized Google Cloud project/OAuth clients and API enablement; verified GA4 properties/GSC sites; Ads developer-token/access qualification and exact advertiser billing/account rights |
| Meta | Facebook/Instagram native adapter is being completed | Authorized app and business/advertiser accounts, approved advertising scopes, Page/Instagram identities and usable licensed creative |
| Microsoft Advertising | Native adapter is being completed | Approved developer token, application consent and exact customer/account permissions; qualify the supported production wire contract |
| TikTok | Native adapter is being completed | Approved Marketing API application, advertiser access/billing and authorized identity/creative; qualify current Spark identity permissions |
| LinkedIn | Native adapter is being completed | Approved Marketing API application/tier, advertiser account/organization roles and licensed creative |
| Independent monitoring | Code supports distinct workspace/dispatch/backup Healthchecks checks | Existing or new monitoring account, three distinct check URLs, real named operator/cover destinations and delivered missed-signal tests |

The explicitly approved invite-only unscanned-file phase does not require a
Cloudmersive account. It retains clear unscanned labels and acknowledgment before
download. If scanning is enabled later, qualify its credential and behavior first.

API app reviews, account billing permissions, a delivered SMTP message, encrypted
offline recovery and usability participants cannot be established by passing mock
tests. Record their observed evidence in the final readiness record. No paid
subscription or new charge is authorized by this checklist.
