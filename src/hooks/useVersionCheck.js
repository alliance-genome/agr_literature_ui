import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Hook that checks for new application versions by polling /version.json.
 * Checks on initial mount and whenever the tab becomes visible.
 * Returns { updateAvailable: boolean } when a newer build is detected.
 */
export const useVersionCheck = () => {
    const initialBuildId = useRef(null);
    const [updateAvailable, setUpdateAvailable] = useState(false);

    const checkVersion = useCallback(async () => {
        if (updateAvailable) return;

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
                setUpdateAvailable(true);
            }
        } catch (error) {
            // Network error or missing file — silently ignore
        }
    }, [updateAvailable]);

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
