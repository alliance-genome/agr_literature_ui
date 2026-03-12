import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Hook that checks for new application versions by polling /version.json.
 * Checks on initial mount and whenever the tab becomes visible.
 * Returns { updateAvailable: boolean } when a newer build is detected.
 */
const MIN_CHECK_INTERVAL_MS = 60_000; // Don't check more than once per minute

export const useVersionCheck = () => {
    const initialBuildId = useRef(null);
    const updateAvailableRef = useRef(false);
    const lastCheckRef = useRef(0);
    const [updateAvailable, setUpdateAvailable] = useState(false);

    const checkVersion = useCallback(async () => {
        if (updateAvailableRef.current) return;
        const now = Date.now();
        if (now - lastCheckRef.current < MIN_CHECK_INTERVAL_MS) return;
        lastCheckRef.current = now;

        try {
            // Cache-bust to ensure we always get the latest version.json
            const response = await fetch(`/version.json?t=${Date.now()}`);
            if (!response.ok) return;

            const data = await response.json();
            const fetchedBuildId = data.buildId;
            if (!fetchedBuildId) return;

            if (initialBuildId.current === null) {
                // First check — store the version we loaded with
                initialBuildId.current = fetchedBuildId;
            } else if (fetchedBuildId !== initialBuildId.current) {
                updateAvailableRef.current = true;
                setUpdateAvailable(true);
            }
        } catch (error) {
            // Network error or missing file — silently ignore
        }
    }, []);

    // Check version on mount
    useEffect(() => {
        checkVersion();
    }, [checkVersion]);

    // Check version when tab becomes visible
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                checkVersion();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [checkVersion]);

    return { updateAvailable };
};

export default useVersionCheck;
