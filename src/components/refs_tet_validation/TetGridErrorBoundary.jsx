import React from 'react';
import { Button, Spinner } from 'react-bootstrap';

// AgGrid (v32) + React 18 with reactiveCustomComponents (cells/headers rendered
// as React portals) can desync during DOM-heavy transitions — data reload,
// show/hide, dynamic column rebuild — and throw a commit-phase
// "Failed to execute 'insertBefore'/'removeChild' on 'Node': ... not a child of
// this node". Such a commit-phase error unwinds the entire React root and
// leaves the whole page blank.
//
// This boundary contains the failure to the grid: a fresh remount behaves like
// the first render (which is stable), so we auto-remount a bounded number of
// times via a changing key, then fall back to a manual reload if it keeps
// failing. It is a safety net, not a substitute for fixing the underlying
// transition — but it guarantees the user never sees a blanked page.
const MAX_AUTO_RETRIES = 2;

export default class TetGridErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, retries: 0 };
    this._timer = null;
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.warn(
      '[TetValidationGrid] recovered from a render error:',
      error,
      info
    );
    // Auto-remount on the next tick while under the cap. setState here is
    // deferred so we are not updating during the failed commit.
    if (this.state.retries < MAX_AUTO_RETRIES) {
      this._timer = setTimeout(() => {
        this.setState((s) => ({ error: null, retries: s.retries + 1 }));
      }, 0);
    }
  }

  componentWillUnmount() {
    if (this._timer) clearTimeout(this._timer);
  }

  handleManualRetry = () => {
    this.setState((s) => ({ error: null, retries: s.retries + 1 }));
  };

  render() {
    const { error, retries } = this.state;

    if (error) {
      // Still under the auto-retry cap: a remount is already scheduled.
      if (retries < MAX_AUTO_RETRIES) {
        return (
          <div style={{ padding: 16 }}>
            <Spinner animation="border" size="sm" /> Reloading topic grid…
          </div>
        );
      }
      // Exhausted auto-retries — let the user trigger a clean remount.
      return (
        <div style={{ padding: 16 }}>
          <p>The topic grid hit a rendering error.</p>
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={this.handleManualRetry}
          >
            Reload grid
          </Button>
        </div>
      );
    }

    // Keying on `retries` forces a fresh mount of the whole subtree on retry.
    return <React.Fragment key={retries}>{this.props.children}</React.Fragment>;
  }
}
