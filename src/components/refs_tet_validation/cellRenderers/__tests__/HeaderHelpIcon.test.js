import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import HeaderHelpIcon from '../HeaderHelpIcon';
import HeaderWithHelp from '../HeaderWithHelp';
import HeaderGroupWithHelp from '../HeaderGroupWithHelp';

const HELP = 'Data assessment by biocurator. Y means data present.';

// SCRUM-6330 follow-up: the grid's ? icons used a native hover tooltip, which
// behaved unlike every other ? in the app (search bar, advanced query
// builder). They must open their explanation on click instead.
describe('HeaderHelpIcon (SCRUM-6330)', () => {
  test('renders nothing when the column has no help text', () => {
    const { container } = render(<HeaderHelpIcon help={undefined} label="X" />);
    expect(container).toBeEmptyDOMElement();
  });

  test('shows the help text only after the ? is clicked', async () => {
    render(<HeaderHelpIcon help={HELP} label="Data assessment by biocurator" />);
    expect(screen.queryByText(HELP)).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Help for Data assessment by biocurator',
      })
    );
    expect(await screen.findByText(HELP)).toBeInTheDocument();
  });

  test('does not expose the help text as a native title tooltip', () => {
    render(<HeaderHelpIcon help={HELP} label="X" />);
    expect(screen.queryByTitle(HELP)).toBeNull();
    expect(screen.getByRole('button', { name: 'Help for X' })).not.toHaveAttribute('title');
  });

  test('a click elsewhere on the page dismisses the popover', async () => {
    render(
      <>
        <HeaderHelpIcon help={HELP} label="X" />
        <div data-testid="elsewhere">grid</div>
      </>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Help for X' }));
    expect(await screen.findByText(HELP)).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('elsewhere'));
    await waitFor(() => expect(screen.queryByText(HELP)).not.toBeInTheDocument());
  });

  // A ? that swallowed the click (to shield the AgGrid header underneath it)
  // would keep the event from reaching document, where react-overlays binds
  // rootClose — leaving a stack of open popovers as the curator clicks along
  // the header. There are one to three ? icons per topic, so this matters.
  test('opening one ? dismisses another that is already open', async () => {
    const OTHER = 'Per-source TET data pills for this topic.';
    render(
      <>
        <HeaderHelpIcon help={HELP} label="Biocurator" />
        <HeaderHelpIcon help={OTHER} label="Data" />
      </>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Help for Biocurator' }));
    expect(await screen.findByText(HELP)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Help for Data' }));
    expect(await screen.findByText(OTHER)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText(HELP)).not.toBeInTheDocument());
  });
});

describe('grid headers source their help from component params', () => {
  test('HeaderWithHelp renders the ? from headerComponentParams.help', async () => {
    render(<HeaderWithHelp displayName="IDs" help={HELP} />);
    fireEvent.click(screen.getByRole('button', { name: 'Help for IDs' }));
    expect(await screen.findByText(HELP)).toBeInTheDocument();
  });

  test('HeaderWithHelp renders no ? when no help param is given', () => {
    render(<HeaderWithHelp displayName="IDs" />);
    expect(screen.queryByRole('button', { name: /^Help/ })).toBeNull();
  });

  test('HeaderGroupWithHelp renders the ? from headerGroupComponentParams.help', async () => {
    render(<HeaderGroupWithHelp displayName="Topic" help={HELP} />);
    fireEvent.click(screen.getByRole('button', { name: 'Help for Topic' }));
    expect(await screen.findByText(HELP)).toBeInTheDocument();
  });
});
