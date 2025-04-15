import index from '../partials/index.js';

const config = require('../config.js').default;

const indexFoo = (c) => {
    return c.html(index(config));
}

export default indexFoo;