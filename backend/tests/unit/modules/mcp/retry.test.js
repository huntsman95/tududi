'use strict';

const {
    isSqliteBusyError,
    withSqliteBusyRetry,
} = require('../../../../modules/mcp/retry');

describe('MCP retry utilities', () => {
    describe('isSqliteBusyError', () => {
        it('should detect SQLITE_BUSY by error code', () => {
            const error = { code: 'SQLITE_BUSY' };
            expect(isSqliteBusyError(error)).toBe(true);
        });

        it('should detect locked database from message', () => {
            const error = { message: 'SQLITE_ERROR: database is locked' };
            expect(isSqliteBusyError(error)).toBe(true);
        });

        it('should return false for non-lock errors', () => {
            const error = { message: 'Validation failed' };
            expect(isSqliteBusyError(error)).toBe(false);
        });
    });

    describe('withSqliteBusyRetry', () => {
        it('should retry SQLITE_BUSY errors and eventually succeed', async () => {
            const operation = jest
                .fn()
                .mockRejectedValueOnce({ code: 'SQLITE_BUSY' })
                .mockRejectedValueOnce({ message: 'database is locked' })
                .mockResolvedValue('ok');

            const result = await withSqliteBusyRetry(operation, {
                maxAttempts: 3,
                baseDelayMs: 1,
            });

            expect(result).toBe('ok');
            expect(operation).toHaveBeenCalledTimes(3);
        });

        it('should throw when max attempts are exhausted', async () => {
            const error = {
                code: 'SQLITE_BUSY',
                message: 'database is locked',
            };
            const operation = jest.fn().mockRejectedValue(error);

            await expect(
                withSqliteBusyRetry(operation, {
                    maxAttempts: 2,
                    baseDelayMs: 1,
                })
            ).rejects.toBe(error);
            expect(operation).toHaveBeenCalledTimes(2);
        });

        it('should not retry non-SQLite lock errors', async () => {
            const error = new Error('Unexpected failure');
            const operation = jest.fn().mockRejectedValue(error);

            await expect(
                withSqliteBusyRetry(operation, {
                    maxAttempts: 3,
                    baseDelayMs: 1,
                })
            ).rejects.toThrow('Unexpected failure');
            expect(operation).toHaveBeenCalledTimes(1);
        });
    });
});
