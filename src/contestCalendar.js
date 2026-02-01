import { parse } from 'node-html-parser';
import { parse as parseDateFns } from 'date-fns';
import { fromZonedTime } from "date-fns-tz";
import { readFileSync } from 'fs';
import { memoize } from 'micro-memoize';

const parseDate = (dateStr) => {
    const dateFormat = "HHmm'Z', MMM d";
    if (!dateStr.includes(" to ")) { // "1400Z-2400Z, Feb 7, 2026" format
        const [_, startTimeStr, endTimeStr, endDateStr] = dateStr.replace("*", "").replace("and", "").replace("2400", "2359").match(/([0-9]+)Z-([0-9]+)Z, (.*)/);
        const startDate = parseDateFns(`${startTimeStr}Z, ${endDateStr}`, `${dateFormat}, yyyy`, new Date());
        const endDate = parseDateFns(`${endTimeStr}Z, ${endDateStr}`, `${dateFormat}, yyyy`, new Date());
        const utcStartDate = fromZonedTime(startDate, "UTC");
        const utcEndDate = fromZonedTime(endDate, "UTC");
        return [utcStartDate, utcEndDate];
    } else {
        const [startStr, endStr] = dateStr.replace("*", "").split(' to ').map((s) => {
            return s.replace("2400", "2359").replace("and", "").trim();
        });
        const startDate = parseDateFns(`${startStr}`, dateFormat, new Date());
        const endDate = parseDateFns(`${endStr}`, `${dateFormat}, yyyy`, new Date());
        const utcStartDate = fromZonedTime(startDate, "UTC");
        const utcEndDate = fromZonedTime(endDate, "UTC");
        return [utcStartDate, utcEndDate];
    }
}

const memoizedFetch = memoize(async (url) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
    return res.text();
}, { async: true, maxAge: 24 * 60 * 60 * 1000 }); // Cache for 24 hours

export async function fetchStateParties(url = 'https://www.contestcalendar.com/stateparties.php') {
  const html = await memoizedFetch(url);
//   if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
//   const html = await res.text();
//   const html = readFileSync('/tmp/stateparties.php', 'utf8');
  const parsed = parse(html);
  const rows = parsed.querySelectorAll('table > tr');
  const tempRow = {};
  const parties = rows.reduce((acc, row) => {
    const cols = row.querySelectorAll('td');
    if (cols[0].text.trim() === 'State') {
        // Header row, skip
        return acc;
    }
    if (cols.length === 1) {
        // Separator or header row
        return acc;
    }
    if (cols.length === 3 && cols[1].text.trim() === '' && cols[2].text.trim() !== '') {
        // Row with second date range from previous row
        const endDateString = cols[2].text.trim();
        acc.push({
            state: tempRow.state,
            dates: {
                start: tempRow.startDate,
                end: parseDate(endDateString)[1]
            }
        });
        return acc;
    }
    if (cols.length === 3) {
        const stateName = cols[0].text.trim();
        const dates = cols[2].text.trim();
        const contestDates = parseDate(dates);
        if (cols[2].text.endsWith("and")) {
            tempRow.state = stateName;
            tempRow.startDate = contestDates[0];
        } else {
            acc.push({
                state: stateName,
                dates: {
                    start: contestDates[0],
                    end: contestDates[1]
                }
            });
        }
    }
    return acc;
  }, []);
  return parties;
}

export default fetchStateParties;
