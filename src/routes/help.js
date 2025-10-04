import helpPartial from '../partials/help.js';

const help = (c) => {
    return c.html(helpPartial(c.get('config')));
}

export default help;
