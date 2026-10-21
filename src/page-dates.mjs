import dates from '../config/page-dates.json' with {type: 'json'};

export function pageDate(path, fallback) {
  return dates[path]?.modifiedAt || fallback;
}

export function readablePageDate(path,fallback='2026-10-21'){
  return new Intl.DateTimeFormat('en-US',{year:'numeric',month:'long',day:'numeric',timeZone:'UTC'}).format(new Date(pageDate(path,fallback)+'T00:00:00Z'));
}
