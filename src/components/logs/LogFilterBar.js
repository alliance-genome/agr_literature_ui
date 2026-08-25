import React from 'react';
import { Button, ButtonGroup, Form } from 'react-bootstrap';

import { ROOT_DIRECTORY_LABEL } from '../../utils/reportFileNames';
import DateRangeQuickPicker from './DateRangeQuickPicker';

const controlStyle = { width: '13em', marginRight: '2em' };

// Presentational: every value comes in as a prop and every change goes back out.
const LogFilterBar = ({
  showScopeControls = true, ownMod, modsInData, directories,
  filters, onChange, onReset, onRefresh
}) => {
  const set = (key) => (value) => onChange({ ...filters, [key]: value });
  const isLatestOnly = filters.mode === 'latest';

  return (
    <div style={{ textAlign: 'left', paddingBottom: '1em' }}>
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '1em' }}>
        {showScopeControls && (
        <ButtonGroup aria-label="MOD scope" size="sm">
          {ownMod && (
            <Button
              variant="outline-secondary"
              active={filters.scope === 'mod'}
              onClick={() => set('scope')('mod')}
            >{`My MOD (${ownMod})`}</Button>
          )}
          <Button
            variant="outline-secondary"
            active={filters.scope === 'all'}
            onClick={() => set('scope')('all')}
          >All MODs</Button>
          <Button
            variant="outline-secondary"
            active={filters.scope === 'shared'}
            onClick={() => set('scope')('shared')}
          >Shared</Button>
        </ButtonGroup>
        )}

        {showScopeControls && (
        <div>
          <Form.Label htmlFor="logs-mod" style={{ marginRight: '0.5em', marginBottom: 0 }}>
            Another MOD
          </Form.Label>
          <Form.Control
            as="select"
            id="logs-mod"
            style={{ width: '9em', display: 'inline-block' }}
            value={filters.scope === 'mod' ? (filters.mod || '') : ''}
            onChange={(e) => onChange({ ...filters, scope: 'mod', mod: e.target.value })}
          >
            <option value="">—</option>
            {modsInData.map((mod) => (
              <option key={mod} value={mod}>{mod}</option>
            ))}
          </Form.Control>
        </div>
        )}

        <ButtonGroup aria-label="Version mode" size="sm">
          <Button
            variant="outline-secondary"
            active={isLatestOnly}
            onClick={() => set('mode')('latest')}
          >Latest only</Button>
          <Button
            variant="outline-secondary"
            active={!isLatestOnly}
            onClick={() => set('mode')('all')}
          >All versions</Button>
        </ButtonGroup>

        <Form.Check
          type="checkbox"
          id="logs-include-shared"
          label="Include shared (no-MOD) files"
          checked={filters.includeShared}
          disabled={showScopeControls && filters.scope !== 'mod'}
          onChange={(e) => set('includeShared')(e.target.checked)}
        />

        <Form.Check
          type="checkbox"
          id="logs-hide-stale"
          label="Hide stale _old folders"
          checked={filters.hideStale}
          onChange={(e) => set('hideStale')(e.target.checked)}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', flexWrap: 'wrap',
                    gap: '1em', paddingTop: '0.75em' }}>
        <div>
          <Form.Label htmlFor="logs-directory">Folder</Form.Label>
          <Form.Control
            as="select"
            id="logs-directory"
            style={controlStyle}
            value={filters.directory}
            onChange={(e) => set('directory')(e.target.value)}
          >
            <option value="">All folders</option>
            {directories.map((directory) => (
              <option key={directory} value={directory}>{directory}</option>
            ))}
          </Form.Control>
        </div>

        <div>
          <Form.Label htmlFor="logs-search">Search</Form.Label>
          <Form.Control
            id="logs-search"
            type="text"
            placeholder="Filter by name…"
            style={controlStyle}
            value={filters.quickFilter}
            onChange={(e) => set('quickFilter')(e.target.value)}
          />
        </div>

        <div>
          <Form.Label>
            Date range{' '}
            <span className="text-muted" style={{ fontWeight: 'normal' }}>
              {isLatestOnly ? '(use All versions to filter by date)' : '(mtime when undated)'}
            </span>
          </Form.Label>
          <DateRangeQuickPicker
            value={filters.dateRange}
            disabled={isLatestOnly}
            onChange={set('dateRange')}
          />
        </div>

        <div style={{ alignSelf: 'center' }}>
          <Button variant="link" onClick={onReset}>Reset filters</Button>
          <Button variant="link" onClick={onRefresh}>Refresh</Button>
        </div>
      </div>
    </div>
  );
};

export { ROOT_DIRECTORY_LABEL };
export default LogFilterBar;
