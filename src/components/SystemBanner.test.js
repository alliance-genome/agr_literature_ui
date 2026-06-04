import React from 'react';
import { render, screen } from '@testing-library/react';
import SystemBanner from './SystemBanner';

describe('SystemBanner', () => {
    test('renders the message text', () => {
        render(<SystemBanner message="System slow 8-9pm ET" severity="warning" />);
        expect(screen.getByText('System slow 8-9pm ET')).toBeInTheDocument();
    });

    test('applies the Bootstrap alert variant matching severity', () => {
        const { container } = render(<SystemBanner message="down" severity="danger" />);
        expect(container.querySelector('.alert-danger')).toBeInTheDocument();
    });

    test('uses the info variant for an info severity', () => {
        const { container } = render(<SystemBanner message="fyi" severity="info" />);
        expect(container.querySelector('.alert-info')).toBeInTheDocument();
    });
});
