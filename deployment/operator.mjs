import { writeFile } from 'node:fs/promises';

// Manual operator, not scheduled automation. Export contains private inquiry data.
const [action, originText, reference, confirmation] = process.argv.slice(2);
async function main() {
  if (!['export', 'retry', 'delete'].includes(action) || !originText) throw new Error('Usage: node deployment/operator.mjs export https://HOST output.json; retry|delete https://HOST REFERENCE CONFIRM_REFERENCE');
  const origin = new URL(originText);
  if (origin.protocol !== 'https:' || origin.username || origin.password || origin.search || origin.hash || origin.pathname !== '/') throw new Error('Use an HTTPS origin only; never put credentials in a URL.');
  if (!process.env.WM_OPERATOR_TOKEN) throw new Error('Load WM_OPERATOR_TOKEN securely in the environment.');
  const headers = { Accept: 'application/json', Authorization: `Bearer ${process.env.WM_OPERATOR_TOKEN}` };
  if (process.env.WM_STAGING_AUTH) headers['X-Staging-Authorization'] = `Basic ${Buffer.from(process.env.WM_STAGING_AUTH).toString('base64')}`;
  if (action === 'export') {
    if (!reference) throw new Error('Provide a private local output path.');
    const records = []; let cursor = '';
    do {
      const response = await fetch(`${origin.origin}/api/operator/inquiries?after=${encodeURIComponent(cursor)}`, { headers, redirect: 'error' });
      if (!response.ok) throw new Error(`Export failed (${response.status}); no response body printed.`);
      const data = await response.json(); records.push(...data.records); cursor = data.next_cursor;
    } while (cursor);
    await writeFile(reference, JSON.stringify({ exported_at: new Date().toISOString(), records }, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    console.log(`Exported ${records.length} records to the requested private file. No inquiry data printed.`); return;
  }
  if (!/^[a-f0-9-]{36}$/.test(reference || '') || confirmation !== reference) throw new Error('Exact reference must be supplied twice to confirm the action.');
  headers[action === 'retry' ? 'X-Confirm-Retry' : 'X-Confirm-Delete'] = reference;
  const response = await fetch(`${origin.origin}/api/operator/inquiries/${reference}${action === 'retry' ? '/retry' : ''}`, { method: action === 'retry' ? 'POST' : 'DELETE', headers, redirect: 'error' });
  if (!response.ok) throw new Error(`Operator action failed (${response.status}); inspect authenticated records without printing secrets.`);
  const result = await response.json(); console.log(result.status || result.message);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
