import indexPartial from '../partials/index.js';

const index = (c) => {
    return c.html(indexPartial(c.get('config')));
}

export default index;
