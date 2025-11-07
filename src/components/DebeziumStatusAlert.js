import Alert from "react-bootstrap/Alert";
import ProgressBar from "react-bootstrap/ProgressBar";
import axios from "axios";
import {useEffect, useState} from "react";


export const DebeziumStatusAlert = () => {
    const [statusData, setStatusData] = useState(null);
    const [isDismissed, setIsDismissed] = useState(false);

    useEffect(() => {
        const checkDebeziumStatus = async () => {
            try {
                const response = await axios.get(
                    process.env.REACT_APP_RESTAPI + '/check/debezium_status',
                    {
                        headers: {
                            'content-type': 'application/json'
                        }
                    }
                );

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

        // Cleanup interval on unmount
        return () => clearInterval(intervalId);
    }, []);

    const handleDismiss = () => {
        setIsDismissed(true);
        // Re-enable the banner after 10 minutes if it was dismissed
        setTimeout(() => setIsDismissed(false), 600000);
    };

    if (!statusData || isDismissed) {
        return null;
    }

    const progressPercentage = statusData.progress_percentage || 0;
    const phase = statusData.phase || 'unknown';
    const estimatedCompletion = statusData.estimated_completion_at;

    // Format phase name for display
    const phaseDisplay = phase
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

    // Format estimated completion time
    let estimatedTimeDisplay = null;
    if (estimatedCompletion) {
        try {
            const date = new Date(estimatedCompletion);
            estimatedTimeDisplay = date.toLocaleString();
        } catch (e) {
            // Invalid date format, skip display
        }
    }

    return (
        <Alert className="debezium-rebuild-alert" variant="warning" onClose={handleDismiss} dismissible>
            <Alert.Heading>Index Rebuild in Progress</Alert.Heading>
            <p>
                The Elasticsearch index is currently being rebuilt. During this time:
            </p>
            <ul>
                <li>Changes you make will not be reflected in the search results until the rebuild is complete</li>
                <li>The interface may be slower than usual</li>
            </ul>
            <div className="mt-3">
                <strong>Current Phase:</strong> {phaseDisplay}
                <ProgressBar
                    now={progressPercentage}
                    label={`${progressPercentage}%`}
                    className="mt-2"
                    striped
                    animated
                />
                {estimatedTimeDisplay && (
                    <div className="mt-2 text-muted">
                        <small>Estimated completion: {estimatedTimeDisplay}</small>
                    </div>
                )}
            </div>
        </Alert>
    );
};