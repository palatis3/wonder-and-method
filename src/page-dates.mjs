import dates from '../config/page-dates.json' with {type: 'json'};

export function pageDate(path, fallback) {
  return dates[path]?.modifiedAt || fallback;
}
