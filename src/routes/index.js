import fetchStateParties from "../contestCalendar";
import indexPartial from '../partials/index.js';
import { getStateCodeFromName } from '../geoutils.js';

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
    // console.log(stateParties)
    return c.html(indexPartial(onlyUSStates.map(party => ({
        state: party.state,
        stateAbbr: getStateCodeFromName(party.state),
        dates: {
            start: party.dates.start,
            end: party.dates.end
        }
    }))));
}

export default index;