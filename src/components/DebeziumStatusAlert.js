import Alert from "react-bootstrap/Alert";
import ProgressBar from "react-bootstrap/ProgressBar";
import { api } from "../api";
import {useEffect, useState} from "react";


export const DebeziumStatusAlert = () => {
    const [statusData, setStatusData] = useState(null);
    const [isDismissed, setIsDismissed] = useState(false);
    const [currentTime, setCurrentTime] = useState(Date.now());

    useEffect(() => {
        const checkDebeziumStatus = async () => {
            try {
                const response = await api.get('/check/debezium_status');

                // Check if Debezium is actively reindexing
                // Response structure: { is_reindexing: boolean, status: string, progress_percentage: number, ... }
                const data = response.data;
                if (data.is_reindexing === true || data.status === 'active') {
                    setStatusData(data);
                } else {
                    setStatusData(null);
                }
            } catch (err) {
                // If the endpoint fails, we don't show the banner
                console.error('Failed to check Debezium status:', err);
                setStatusData(null);
            }
        };

        // Check immediately on mount
        checkDebeziumStatus();

        // Set up periodic checking every 2 minutes (120000 ms)
        const intervalId = setInterval(checkDebeziumStatus, 120000);

        // Update current time every 5 seconds for dynamic progress calculation
        const timeUpdateInterval = setInterval(() => {
            setCurrentTime(Date.now());
        }, 5000);

        // Cleanup intervals on unmount
        return () => {
            clearInterval(intervalId);
            clearInterval(timeUpdateInterval);
        };
    }, []);

    const handleDismiss = () => {
        setIsDismissed(true);
        // Re-enable the banner after 10 minutes if it was dismissed
        setTimeout(() => setIsDismissed(false), 600000);
    };

    if (!statusData || isDismissed) {
        return null;
    }

    // Calculate dynamic progress and ETA based on started_at and historical metrics
    let dynamicProgress = statusData.progress_percentage || 0;
    let dynamicETA = null;
    let elapsedSeconds = 0;
    let totalEstimatedSeconds = null;

    const startedAt = statusData.started_at;
    const historicalMetrics = statusData.historical_metrics;

    if (startedAt) {
        try {
            const startTime = new Date(startedAt);
            elapsedSeconds = Math.floor((currentTime - startTime.getTime()) / 1000);

            // Use historical average duration if available
            if (historicalMetrics?.average_duration_seconds) {
                totalEstimatedSeconds = historicalMetrics.average_duration_seconds;

                // Calculate dynamic progress based on elapsed time
                const calculatedProgress = Math.min(95, Math.floor((elapsedSeconds / totalEstimatedSeconds) * 100));

                // Use the maximum of API-reported progress or time-based progress
                dynamicProgress = Math.max(dynamicProgress, calculatedProgress);

                // Calculate dynamic ETA
                const remainingSeconds = Math.max(0, totalEstimatedSeconds - elapsedSeconds);
                dynamicETA = new Date(currentTime + (remainingSeconds * 1000));
            }
        } catch (e) {
            // If calculation fails, fall back to API values
            console.error('Error calculating dynamic progress:', e);
        }
    }

    const phase = statusData.phase || 'unknown';

    // Format phase name for display
    const phaseDisplay = phase
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

    // Format estimated completion time (prefer dynamic ETA, fallback to API ETA)
    let estimatedTimeDisplay = null;
    const etaToUse = dynamicETA || (statusData.estimated_completion_at ? new Date(statusData.estimated_completion_at) : null);

    if (etaToUse) {
        try {
            estimatedTimeDisplay = etaToUse.toLocaleString();
        } catch (e) {
            // Invalid date format, skip display
        }
    }

    // Format elapsed time for display
    const formatElapsedTime = (seconds) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours}h ${minutes}m ${secs}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    };

    return (
        <div style={{margin: '5px'}}>
            <Alert variant="warning" onClose={handleDismiss} dismissible>
                <Alert.Heading>Index Rebuild in Progress</Alert.Heading>
                <div>
                    The Elasticsearch index is currently being rebuilt. During this time:
                    <div style={{marginTop: '0.5rem'}}>
                        • Changes you make will not be reflected in the search results until the rebuild is complete
                    </div>
                    <div>
                        • The interface may be slower than usual
                    </div>
                </div>
                <div style={{marginTop: '1rem', marginBottom: 0}}>
                    <div><strong>Current Phase:</strong> {phaseDisplay}</div>
                    {elapsedSeconds > 0 && (
                        <div style={{marginTop: '0.5rem'}}><strong>Elapsed Time:</strong> {formatElapsedTime(elapsedSeconds)}</div>
                    )}
                    <div style={{marginTop: '0.5rem'}}><strong>Progress:</strong> {dynamicProgress}%</div>
                    <ProgressBar
                        now={dynamicProgress}
                        style={{marginTop: '0.25rem', height: '25px'}}
                        striped
                        animated
                        variant="success"
                    />
                    {estimatedTimeDisplay && (
                        <div style={{marginTop: '0.75rem', marginBottom: 0}}>
                            <strong>Estimated completion:</strong> {estimatedTimeDisplay}
                        </div>
                    )}
                </div>
            </Alert>
        </div>
    );
};