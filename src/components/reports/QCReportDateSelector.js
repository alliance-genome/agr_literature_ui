import React, { useEffect, useState } from 'react';
import Form from 'react-bootstrap/Form';

import { api } from '../../api';
import { convertDate } from '../../utils/reportDates';

/**
 * Date picker for one QC report's archived runs.
 *
 * Each QC report is regenerated on its own monthly schedule, and every run
 * leaves a datestamped copy of its log behind. This lists those runs newest
 * first and reports the chosen one back to the parent, which refetches the
 * report for that date - replacing the old "report history" link out to a raw
 * directory index.
 *
 * `onChange` must be a stable reference (pass a `useState` setter, not an inline
 * arrow): it is called once on load to select the newest run, and it is a
 * dependency of the fetch effect.
 *
 * Renders nothing when no archived runs are available - on an older API without
 * the endpoint, or on a host with no history yet - and reports '' instead of a
 * datestamp, so the parent can tell "still loading the list" (its initial null)
 * from "there is no history" and fall back to showing the latest report.
 */
const QCReportDateSelector = ({ reportKey, label = 'Report date', selectedDate, onChange }) => {
  const [dates, setDates] = useState([]);

  useEffect(() => {
    let cancelled = false;

    const fetchDates = async () => {
      try {
        const result = await api.get(`/check/qc_report_dates/${reportKey}`);
        const available = result.data?.dates || [];
        if (cancelled) { return; }
        setDates(available);
        // Default to the newest run, which is what the page showed before.
        // '' means "resolved, but no history here" - distinct from the initial
        // null - so the parent knows it may go ahead and load the latest report.
        onChange(available.length > 0 ? available[0] : '');
      } catch (error) {
        console.error(`Error fetching report dates for ${reportKey}:`, error);
        if (!cancelled) { onChange(''); }
      }
    };

    fetchDates();
    return () => { cancelled = true; };
  }, [reportKey, onChange]);

  if (dates.length === 0) { return null; }

  return (
    <div style={{ textAlign: 'left', marginBottom: '0.75em' }}>
      <Form.Label htmlFor={`${reportKey}_date`} style={{ marginRight: '0.5em', marginBottom: 0 }}>
        {label}
      </Form.Label>
      <Form.Control
        as='select'
        id={`${reportKey}_date`}
        name={`${reportKey}_date`}
        style={{ width: '13em', display: 'inline-block' }}
        value={selectedDate || ''}
        onChange={(e) => onChange(e.target.value)}
      >
        {dates.map(date => (
          <option key={date} value={date}>{convertDate(date)}</option>
        ))}
      </Form.Control>
    </div>
  );
};

export default QCReportDateSelector;
