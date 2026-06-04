import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Hook that surfaces a system-status banner whose content is controlled by an
 * externally-editable, same-origin file at /banner.json. The file is NOT part
 * of the build (see docs/superpowers/specs/2026-06-03-system-status-banner-design.md):
 * in deployment it is a runtime-mounted volume, locally it is public/banner.json.
 *
 * Polls on mount, on tab visibility, and on a periodic interval (mirrors
 * useVersionCheck). Returns { message, severity } when there is a banner to
 * show, or null. Fails safe and silent on every error path (missing file,
 * 404, HTML fallback, malformed JSON, blank message).
 *
 * File format: { "message": string, "severity": "info" | "warning" | "danger" }
 */
const MIN_CHECK_INTERVAL_MS = 60_000; // Don't check more than once per minute
const POLL_INTERVAL_MS = 5 * 60_000; // Periodic poll cadence (5 minutes)
const BANNER_URL = '/banner.json';
const VALID_SEVERITIES = ['info', 'warning', 'danger'];
const DEFAULT_SEVERITY = 'info';

/**
 * Parse raw banner-file text into { message, severity } or null.
 * Pure and total: any malformed/empty/blank input yields null.
 */
export const parseBanner = (text) => {
    if (!text || !text.trim()) return null;

    let data;
    try {
        data = JSON.parse(text);
    } catch (error) {
        // Malformed JSON, or an HTML body (e.g. local dev's index.html
        // fallback when the file is absent) — treat as "no banner".
        return null;
    }

    if (!data || typeof data.message !== 'string' || !data.message.trim()) {
        return null;
    }

    const severity = VALID_SEVERITIES.includes(data.severity)
        ? data.severity
        : DEFAULT_SEVERITY;

    return { message: data.message, severity };
};

/**
 * Fetch and parse the banner file. Returns { message, severity } or null.
 * fetchImpl is injectable for testing; defaults to the global fetch.
 */
export const fetchBanner = async (url, fetchImpl = fetch) => {
    if (!url) return null;

    try {
        // Cache-bust so we always read the latest banner content.
        const response = await fetchImpl(`${url}?t=${Date.now()}`);
        if (!response.ok) return null;

        const text = await response.text();
        return parseBanner(text);
    } catch (error) {
        // Network error or missing file — silently ignore.
        return null;
    }
};

export const useSystemBanner = () => {
    const lastCheckRef = useRef(0);
    const [banner, setBanner] = useState(null);

    const checkBanner = useCallback(async () => {
        const now = Date.now();
        if (now - lastCheckRef.current < MIN_CHECK_INTERVAL_MS) return;
        lastCheckRef.current = now;

        const result = await fetchBanner(BANNER_URL);
        setBanner(result);
    }, []);

    // Check on mount
    useEffect(() => {
        checkBanner();
    }, [checkBanner]);

    // Check when the tab becomes visible
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                checkBanner();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [checkBanner]);

    // Poll periodically so a freshly-published banner appears even if the user
    // never switches tabs.
    useEffect(() => {
        const intervalId = setInterval(checkBanner, POLL_INTERVAL_MS);
        return () => {
            clearInterval(intervalId);
        };
    }, [checkBanner]);

    return banner;
};

export default useSystemBanner;
