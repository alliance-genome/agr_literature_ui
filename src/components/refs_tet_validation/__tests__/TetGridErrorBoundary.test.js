import React from 'react';
import { render, screen, act } from '@testing-library/react';
import TetGridErrorBoundary from '../TetGridErrorBoundary';

// Regression tests for the per-query retry budget (SCRUM-6228). The boundary
// auto-remounts the grid on a transient AgGrid/React-18 commit-phase desync, but
// only a bounded number of times PER QUERY; a new query (changed resetKey) must
// restore that budget instead of dropping straight to the manual "Reload grid".
describe('TetGridErrorBoundary (per-query retry budget, SCRUM-6228)', () => {
  // Throws on the first `failTimes` renders across the whole test, then renders ok.
  let renderCount;
  const Boom = ({ failTimes }) => {
    if (renderCount < failTimes) {
      renderCount += 1;
      throw new Error("Failed to execute 'insertBefore' on 'Node'");
    }
    return <div>grid ok</div>;
  };

  let errSpy;
  let warnSpy;
  beforeEach(() => {
    renderCount = 0;
    jest.useFakeTimers();
    // Error boundaries make React log the caught error; keep test output clean.
    errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    errSpy.mockRestore();
    warnSpy.mockRestore();
  });

  test('auto-recovers within the per-query budget', () => {
    render(
      <TetGridErrorBoundary resetKey="q1">
        <Boom failTimes={1} />
      </TetGridErrorBoundary>
    );
    // First render threw; the scheduled auto-remount then renders successfully.
    act(() => { jest.runAllTimers(); });
    expect(screen.getByText('grid ok')).toBeInTheDocument();
  });

  // The fix lives in getDerivedStateFromProps: a changed resetKey (new query) clears
  // the error and the accumulated retry count, giving a fresh auto-recovery budget;
  // an unchanged resetKey is a no-op so within-query retry counting is untouched.
  test('changed resetKey clears error and resets the retry budget', () => {
    const reset = TetGridErrorBoundary.getDerivedStateFromProps(
      { resetKey: 'q2' },
      { error: new Error('desync'), retries: 2, lastResetKey: 'q1' }
    );
    expect(reset).toEqual({ error: null, retries: 0, lastResetKey: 'q2' });
  });

  test('unchanged resetKey is a no-op (per-query cap preserved)', () => {
    const noop = TetGridErrorBoundary.getDerivedStateFromProps(
      { resetKey: 'q1' },
      { error: new Error('desync'), retries: 2, lastResetKey: 'q1' }
    );
    expect(noop).toBeNull();
  });
});
