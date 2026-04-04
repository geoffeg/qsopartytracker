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
    const res = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; QSO-Party-Tracker/1.0; +kc8fdu@geoffeg.org)',
            'Referer': 'https://mobiletracker.stateqso.com/'
        }
    });
    if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
    return res.text();
}, {
    async: true,
    maxSize: 100, // More than enough room for the main page and all state party pages
    expires: 24 * 60 * 60 * 1000 + Math.floor(Math.random() * 60000), // Cache for 24 hours, plus a little randomness to avoid cache stampedes
});
memoizedFetch.cache.on('add', (event) => console.log(`Cache miss for URL fetch: ${event.key}`));

function extractLinkRefFromRow(row) {
    const link = row.querySelector('a');
    if (link) {
        const match = link.getAttribute('href').match(/ref=(\d+)/);
        if (match) {
            return match[1];
        }
    }
    return null;
}

export async function fetchStateParties(url = 'https://www.contestcalendar.com/stateparties.php') {
  const html = await memoizedFetch(url);
//   if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
//   const html = await res.text();
//   const html = readFileSync('/tmp/stateparties.php', 'utf8');
  const parsed = parse(html);
  const rows = parsed.querySelectorAll('table > tr');
  let tempRow = {};
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
            refId: tempRow.refId,
            dates: {
                start: tempRow.startDate,
                end: parseDate(endDateString)[1]
            }
        });
        tempRow = {};
        return acc;
    }
    if (cols.length === 3) {
        const stateName = cols[0].text.trim();
        const dates = cols[2].text.trim();
        const contestDates = parseDate(dates);
        if (cols[2].text.endsWith("and")) {
            tempRow.refId = extractLinkRefFromRow(cols[1]);
            tempRow.state = stateName;
            tempRow.startDate = contestDates[0];
        } else {
            acc.push({
                state: stateName,
                refId: extractLinkRefFromRow(cols[1]),
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



export async function fetchPartyRules(partyRefId) {
    if (!partyRefId) return null;
    const url = `https://www.contestcalendar.com/contestdetails.php?ref=${partyRefId}`;
    const html = await memoizedFetch(url);
    const parsed = parse(html);
    const tableRows = parsed.querySelectorAll('table[width="100%"] > tr');

    const rulesLink = tableRows.reduce((acc, row) => {
        const secondTD = row.querySelectorAll('td');
        if (secondTD.length < 3) return acc;
        if (secondTD && secondTD[1].text.trim() === 'Find rules at:') {
            const thirdTDLink = row.querySelectorAll('td')[2].querySelector('a');
            if (thirdTDLink) {
                return thirdTDLink.getAttribute('href');
            }
        }
        return acc;
    }, null);
    return rulesLink;
}


export default fetchStateParties;
