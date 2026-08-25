import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import QCReportDateSelector from '../QCReportDateSelector';
import { api } from '../../../api';

jest.mock('../../../api', () => ({ api: { get: jest.fn() } }));

describe('QCReportDateSelector', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        console.error.mockRestore();
    });

    const renderSelector = (props = {}) => {
        const onChange = jest.fn();
        const utils = render(
            <QCReportDateSelector
                reportKey="obsolete_entities"
                selectedDate={null}
                onChange={onChange}
                {...props}
            />
        );
        return { onChange, ...utils };
    };

    test('asks the API for the dates of the report it was given', async () => {
        api.get.mockResolvedValue({ data: { dates: ['20260707'] } });
        renderSelector({ reportKey: 'duplicate_orcids' });
        await waitFor(() => expect(api.get).toHaveBeenCalledWith('/check/qc_report_dates/duplicate_orcids'));
    });

    test('lists the available runs as readable dates', async () => {
        api.get.mockResolvedValue({ data: { dates: ['20260707', '20260607'] } });
        renderSelector();
        expect(await screen.findByRole('option', { name: '2026-07-07' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: '2026-06-07' })).toBeInTheDocument();
    });

    test('selects the newest run on load', async () => {
        api.get.mockResolvedValue({ data: { dates: ['20260707', '20260607'] } });
        const { onChange } = renderSelector();
        await waitFor(() => expect(onChange).toHaveBeenCalledWith('20260707'));
    });

    test('reports the run the user picks', async () => {
        api.get.mockResolvedValue({ data: { dates: ['20260707', '20260607'] } });
        const { onChange } = renderSelector({ selectedDate: '20260707' });
        const select = await screen.findByRole('combobox');
        await userEvent.selectOptions(select, '20260607');
        expect(onChange).toHaveBeenCalledWith('20260607');
    });

    test('renders nothing and reports no history when there are no archived runs', async () => {
        api.get.mockResolvedValue({ data: { dates: [] } });
        const { onChange, container } = renderSelector();
        await waitFor(() => expect(onChange).toHaveBeenCalledWith(''));
        expect(container).toBeEmptyDOMElement();
        expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    });

    test('reports no history when the endpoint is unavailable, so the parent can fall back', async () => {
        api.get.mockRejectedValue(new Error('404'));
        const { onChange, container } = renderSelector();
        await waitFor(() => expect(onChange).toHaveBeenCalledWith(''));
        expect(container).toBeEmptyDOMElement();
    });

    test('tolerates a response with no dates field', async () => {
        api.get.mockResolvedValue({ data: {} });
        const { onChange } = renderSelector();
        await waitFor(() => expect(onChange).toHaveBeenCalledWith(''));
    });
});
