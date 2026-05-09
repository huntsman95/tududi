'use strict';

const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_BASE_DELAY_MS = 100;

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function isSqliteBusyError(error) {
    if (!error) return false;

    const code = error.original?.code || error.parent?.code || error.code;
    if (code === 'SQLITE_BUSY') {
        return true;
    }

    const message = `${error.message || ''} ${error.original?.message || ''}`;
    return /SQLITE_BUSY|database is locked/i.test(message);
}

async function withSqliteBusyRetry(operation, options = {}) {
    const maxAttempts = options.maxAttempts || DEFAULT_MAX_ATTEMPTS;
    const baseDelayMs = options.baseDelayMs || DEFAULT_BASE_DELAY_MS;

    let attempt = 0;
    while (attempt < maxAttempts) {
        attempt += 1;
        try {
            return await operation();
        } catch (error) {
            const canRetry =
                isSqliteBusyError(error) && attempt < maxAttempts;
            if (!canRetry) {
                throw error;
            }

            const delay = baseDelayMs * 2 ** (attempt - 1);
            await sleep(delay);
        }
    }
}

module.exports = {
    isSqliteBusyError,
    withSqliteBusyRetry,
};

