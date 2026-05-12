import { randomUUID } from 'crypto';
import pino, { type Logger, type LoggerOptions } from 'pino';
import type { Params } from 'nestjs-pino';

type LogLevel = 'fatal' | 'critical' | 'error' | 'warn' | 'info' | 'debug' | 'trace';

const DEFAULT_LEVEL = normalizeLevel(process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'production' ? 'info' : 'trace'));

export function createRootLogger(): Logger {
    const options: LoggerOptions = {
        level: DEFAULT_LEVEL,
        timestamp: pino.stdTimeFunctions.isoTime,
        customLevels: {
            critical: 55
        }
    };

    if (process.env.NODE_ENV !== 'production') {
        const transport = pino.transport({
            target: 'pino-pretty',
            options: {
                colorize: true,
                singleLine: true,
                translateTime: 'SYS:standard',
                ignore: 'pid,hostname'
            }
        });

        return pino(options, transport);
    }

    return pino(options);
}

export function createLoggerModuleParams(): Params {
    const rootLogger = createRootLogger();

    return {
        renameContext: 'context',
        pinoHttp: {
            logger: rootLogger,
            genReqId: (req) => {
                const headerRequestId = req.headers['x-request-id'];
                if (typeof headerRequestId === 'string' && headerRequestId.trim()) {
                    return headerRequestId.trim();
                }

                return randomUUID();
            },
            customLogLevel: (_req, res, err) => {
                if (err || res.statusCode >= 500) {
                    return 'error';
                }

                if (res.statusCode >= 400) {
                    return 'warn';
                }

                return 'info';
            }
        }
    };
}

function normalizeLevel(level: string): LogLevel {
    const normalized = level.toLowerCase();
    if (normalized === 'fatal' || normalized === 'critical' || normalized === 'error' || normalized === 'warn' || normalized === 'info' || normalized === 'debug' || normalized === 'trace') {
        return normalized;
    }

    return 'trace';
}
