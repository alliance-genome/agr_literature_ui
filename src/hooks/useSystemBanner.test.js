import { parseBanner, fetchBanner } from './useSystemBanner';

describe('parseBanner', () => {
    test('returns message and severity for valid non-empty JSON', () => {
        const out = parseBanner('{"message":"System slow 8-9pm","severity":"warning"}');
        expect(out).toEqual({ message: 'System slow 8-9pm', severity: 'warning' });
    });

    test('returns null for an empty file', () => {
        expect(parseBanner('')).toBeNull();
    });

    test('returns null for whitespace-only content', () => {
        expect(parseBanner('   \n  ')).toBeNull();
    });

    test('returns null for malformed JSON', () => {
        expect(parseBanner('{not valid json')).toBeNull();
    });

    test('returns null for an HTML body (local-dev absent-file fallback)', () => {
        expect(parseBanner('<!DOCTYPE html><html><body>app</body></html>')).toBeNull();
    });

    test('returns null when message key is missing', () => {
        expect(parseBanner('{"severity":"info"}')).toBeNull();
    });

    test('returns null when message is blank/whitespace', () => {
        expect(parseBanner('{"message":"   "}')).toBeNull();
    });

    test('defaults severity to info when absent', () => {
        expect(parseBanner('{"message":"hi"}')).toEqual({ message: 'hi', severity: 'info' });
    });

    test('defaults severity to info when not one of info/warning/danger', () => {
        expect(parseBanner('{"message":"hi","severity":"explode"}'))
            .toEqual({ message: 'hi', severity: 'info' });
    });

    test('accepts danger severity', () => {
        expect(parseBanner('{"message":"down","severity":"danger"}'))
            .toEqual({ message: 'down', severity: 'danger' });
    });
});

describe('fetchBanner', () => {
    const okResponse = (text) => ({ ok: true, text: () => Promise.resolve(text) });

    test('returns parsed banner on a successful fetch', async () => {
        const fetchImpl = jest.fn().mockResolvedValue(
            okResponse('{"message":"hello","severity":"info"}')
        );
        const out = await fetchBanner('/banner.json', fetchImpl);
        expect(out).toEqual({ message: 'hello', severity: 'info' });
    });

    test('cache-busts the request URL', async () => {
        const fetchImpl = jest.fn().mockResolvedValue(okResponse('{"message":"x"}'));
        await fetchBanner('/banner.json', fetchImpl);
        expect(fetchImpl).toHaveBeenCalledTimes(1);
        expect(fetchImpl.mock.calls[0][0]).toMatch(/^\/banner\.json\?/);
    });

    test('returns null on a non-ok response (404 when file absent)', async () => {
        const fetchImpl = jest.fn().mockResolvedValue({ ok: false, status: 404 });
        expect(await fetchBanner('/banner.json', fetchImpl)).toBeNull();
    });

    test('returns null on a network error', async () => {
        const fetchImpl = jest.fn().mockRejectedValue(new Error('network'));
        expect(await fetchBanner('/banner.json', fetchImpl)).toBeNull();
    });

    test('returns null when the URL is not configured', async () => {
        const fetchImpl = jest.fn();
        expect(await fetchBanner('', fetchImpl)).toBeNull();
        expect(fetchImpl).not.toHaveBeenCalled();
    });
});
