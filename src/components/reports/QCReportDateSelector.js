import React, { useEffect, useState } from 'react';
import Form from 'react-bootstrap/Form';

import { api } from '../../api';
import { convertDate } from '../../utils/reportDates';

/**
 * Date picker for one QC report's archived runs.
 *
 * Each QC report is regenerated on its own monthly schedule, and every run
 * leaves a datestamped copy of its log behind. This lists those runs and
 * reports the chosen one back to the parent, which refetches the report for
 * that date - replacing the old "report history" link out to a raw directory
 * index.
 *
 * The first option is "Latest", which reports '' rather than a datestamp so the
 * parent asks for the current run by omitting the date entirely. That is
 * deliberately a moving pointer, not a pinned date: a run holds the undated
 * filename while it is current, so asking for no date always follows it. It is
 * offered whenever a current run exists, labelled with its date when it has
 * one - a hand-made log with no date header is still the newest data, and
 * defaulting to an archive instead would quietly show something staler.
 *
 * `onChange` must be a stable reference (pass a `useState` setter, not an inline
 * arrow): it is called once on load to pick the default, and it is a dependency
 * of the fetch effect.
 *
 * Renders nothing when there is nothing to choose between - no archived runs, an
 * older API without the endpoint, or a host with no history - and reports ''
 * then too, so the parent can tell "still loading the list" (its initial null)
 * from "just show the latest".
 */
const QCReportDateSelector = ({ reportKey, label = 'Report date', selectedDate, onChange }) => {
  // Archived runs only; the current one is offered as "Latest" instead.
  const [dates, setDates] = useState([]);
  // Datestamp the current, undated run reports for itself - null if it has none.
  const [latest, setLatest] = useState(null);
  // Whether a current run exists at all, which is not the same as it having a
  // date: a hand-written log with no date header is still the current run.
  const [hasLatest, setHasLatest] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchDates = async () => {
      try {
        const result = await api.get(`/check/qc_report_dates/${reportKey}`);
        if (cancelled) { return; }
        const available = result.data?.dates || [];
        const current = result.data?.latest || null;
        // An older API sends no has_latest; a date implies a current run there.
        const currentExists = result.data?.has_latest ?? Boolean(current);
        // The current run is represented by "Latest", so drop its date from the
        // archived list rather than offering the same file twice.
        const archived = available.filter(date => date !== current);
        setLatest(current);
        setHasLatest(currentExists);
        setDates(archived);
        // '' asks for the current run, and is also how "nothing to choose from"
        // is reported - either way the parent loads the latest report. It is
        // distinct from the initial null, which means the list is still loading.
        // With no current run there is nothing for "Latest" to point at, so the
        // newest archived run becomes the default instead.
        onChange((currentExists || archived.length === 0) ? '' : archived[0]);
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
        style={{ width: '15em', display: 'inline-block' }}
        value={selectedDate || ''}
        onChange={(e) => onChange(e.target.value)}
      >
        {hasLatest && (
          <option value=''>{latest ? `Latest (${convertDate(latest)})` : 'Latest'}</option>
        )}
        {dates.map(date => (
          <option key={date} value={date}>{convertDate(date)}</option>
        ))}
      </Form.Control>
    </div>
  );
};

export default QCReportDateSelector;
