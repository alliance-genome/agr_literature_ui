import React from 'react';
import { Button, ButtonGroup } from 'react-bootstrap';
import DateRangePicker from '@wojtekmaj/react-daterange-picker';
import '@wojtekmaj/react-daterange-picker/dist/DateRangePicker.css';
import 'react-calendar/dist/Calendar.css';

import { fixedTimeframeRange, formatToUTCString, rangeFromPickerValue } from '../../utils/dateRange';

// Day/Week/Month/Year shortcuts plus a free range, matching the picker on the
// Reports page. Controlled: `value` is ['YYYY-MM-DD','YYYY-MM-DD'] or '' when unset.
const DateRangeQuickPicker = ({ value, onChange, disabled }) => {
  const handleRangeChange = (range) => {
    const next = rangeFromPickerValue(range);
    if (next !== undefined) onChange(next);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <ButtonGroup aria-label="Date range shortcuts" size="sm" style={{ display: 'block' }}>
        {['Day', 'Week', 'Month', 'Year'].map((timeframe) => (
          <Button
            key={timeframe}
            variant="secondary"
            disabled={disabled}
            onClick={() => onChange(fixedTimeframeRange(timeframe))}
          >{timeframe}</Button>
        ))}
      </ButtonGroup>
      <DateRangePicker
        value={formatToUTCString(value)}
        disabled={disabled}
        onChange={handleRangeChange}
      />
    </div>
  );
};

export default DateRangeQuickPicker;
