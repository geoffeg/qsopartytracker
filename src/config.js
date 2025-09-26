
const path = require('path');
const configPath = path.resolve(__dirname, '..', process.env.CONFIG_PATH);

const config = require(configPath);

export default config.default;