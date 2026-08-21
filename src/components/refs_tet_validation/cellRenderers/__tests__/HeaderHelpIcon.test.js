import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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

  test('a click on the ? does not reach the header cell (which would sort)', async () => {
    const onHeaderClick = jest.fn();
    render(
      // eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events
      <div onClick={onHeaderClick}>
        <HeaderHelpIcon help={HELP} label="X" />
      </div>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Help for X' }));
    await screen.findByText(HELP);
    expect(onHeaderClick).not.toHaveBeenCalled();
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
