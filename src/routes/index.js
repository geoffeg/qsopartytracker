import {fetchStateParties, fetchPartyRules} from "../contestCalendar";
import { getStateCodeFromName } from '../geoutils.js';
import { formatDistance } from "date-fns";

const index = async (c) => {
    const stateParties = await fetchStateParties();
    const distinctQSOParties = [...new Set(stateParties.map(p => p.qsoPartyName))];
    const onlyDistinctQSOParties = distinctQSOParties.map(qsoPartyName => {
        return stateParties.find(p => p.qsoPartyName === qsoPartyName);
    });
    const onlyUSStates = onlyDistinctQSOParties.filter((party) => {
        return getStateCodeFromName(party.state) !== null;
    });
    
    // Filter out parties that have already ended
    const now = new Date();
    onlyUSStates.splice(0, onlyUSStates.length, ...onlyUSStates.filter((party) => {
        return party.dates.end >= now;
    }));

    // Filter out parties that are more than 30 days in the future
    onlyUSStates.splice(0, onlyUSStates.length, ...onlyUSStates.filter((party) => {
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        return party.dates.start <= thirtyDaysFromNow;
    }));

    const config = c.get('config');
    const partialDataPromises = onlyUSStates.map(async (party) => {
        const [operationCode, stateConfig] = Object.entries(config.qsoParties).find(([partyId, partyConfig]) => {
            return partyConfig.contestCalendarId == party.refId;
        }) || {};
        const rulesUrl = stateConfig && party.refId ? await fetchPartyRules(party.refId) : null;

        return {
            state: party.state,
            qsoPartyName: stateConfig?.operationTitle,
            qsoPartyCode: operationCode,
            rulesUrl: rulesUrl,
            stateAbbr: getStateCodeFromName(party.state),
            timeToStart: formatDistance(now, new Date(party.dates.start)),
            timeSinceStart: formatDistance(new Date(party.dates.start), now),
            start: party.dates.start,
            isSupported: stateConfig !== undefined,
        }
    });
    const partialDataPromiseResults = await Promise.allSettled(partialDataPromises);
    const partialData = partialDataPromiseResults.map(result => {
        if (result.status === 'fulfilled') {
            return result.value;
        } else {
            c.get('logger').error(`Error processing party data: ${result.reason}`);
            return null;
        }
    }).filter(p => p !== null);

    return c.html(c.get('eta').render('index', { upcomingParties: partialData }));
}

export default index;