import fetchStateParties from "../contestCalendar";
import { getStateCodeFromName } from '../geoutils.js';
import { formatDistance } from "date-fns";

const index = async (c) => {
    const stateParties = await fetchStateParties();
    const onlyUSStates = stateParties.filter((party) => {
        return getStateCodeFromName(party.state) !== null;
    });
    
    // Filter out parties that have already ended
    const today = new Date();
    onlyUSStates.splice(0, onlyUSStates.length, ...onlyUSStates.filter((party) => {
        return party.dates.end >= today;
    }));

    // Filter out parties that are more than 30 days in the future
    onlyUSStates.splice(0, onlyUSStates.length, ...onlyUSStates.filter((party) => {
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        return party.dates.start <= thirtyDaysFromNow;
    }));

    const now = new Date();
    const partialData = onlyUSStates.map(party => ({
        state: party.state,
        stateAbbr: getStateCodeFromName(party.state),
        timeToStart: formatDistance(now, new Date(party.dates.start)),
        start: party.dates.start,
    }))

    return c.html(c.get('eta').render('index', { upcomingParties: partialData }));
}

export default index;