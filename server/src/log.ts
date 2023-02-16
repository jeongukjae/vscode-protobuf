import pino from 'pino';
import PinoPretty from 'pino-pretty';

const pretty = PinoPretty({colorize: false, ignore: "pid,hostname"});
const logger = pino(pretty);

export default logger;
