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
        api.get.mockResolvedValue({ data: { dates: ['20260707'], has_latest: true } });
        renderSelector({ reportKey: 'duplicate_orcids' });
        await waitFor(() => expect(api.get).toHaveBeenCalledWith('/check/qc_report_dates/duplicate_orcids'));
    });

    test('lists the archived runs as readable dates', async () => {
        api.get.mockResolvedValue({ data: { dates: ['20260707', '20260607'], latest: '20260707', has_latest: true } });
        renderSelector();
        expect(await screen.findByRole('option', { name: '2026-06-07' })).toBeInTheDocument();
    });

    test('offers the current run as Latest, labelled with its date', async () => {
        api.get.mockResolvedValue({ data: { dates: ['20260707', '20260607'], latest: '20260707', has_latest: true } });
        renderSelector();
        expect(await screen.findByRole('option', { name: 'Latest (2026-07-07)' })).toBeInTheDocument();
    });

    test('does not offer the current run twice', async () => {
        api.get.mockResolvedValue({ data: { dates: ['20260707', '20260607'], latest: '20260707', has_latest: true } });
        renderSelector();
        await screen.findByRole('option', { name: 'Latest (2026-07-07)' });
        expect(screen.queryByRole('option', { name: '2026-07-07' })).not.toBeInTheDocument();
    });

    test('defaults to Latest, which asks for no particular date', async () => {
        api.get.mockResolvedValue({ data: { dates: ['20260707', '20260607'], latest: '20260707', has_latest: true } });
        const { onChange } = renderSelector();
        await waitFor(() => expect(onChange).toHaveBeenCalledWith(''));
    });

    test('Latest stays selectable after picking an archived run', async () => {
        api.get.mockResolvedValue({ data: { dates: ['20260707', '20260607'], latest: '20260707', has_latest: true } });
        const { onChange } = renderSelector({ selectedDate: '20260607' });
        const select = await screen.findByRole('combobox');
        await userEvent.selectOptions(select, '');
        expect(onChange).toHaveBeenCalledWith('');
    });

    test('reports the archived run the user picks', async () => {
        api.get.mockResolvedValue({ data: { dates: ['20260707', '20260607'], latest: '20260707', has_latest: true } });
        const { onChange } = renderSelector({ selectedDate: '' });
        const select = await screen.findByRole('combobox');
        await userEvent.selectOptions(select, '20260607');
        expect(onChange).toHaveBeenCalledWith('20260607');
    });

    test('falls back to the newest archive when there is no current run', async () => {
        // Only archives on disk: nothing for Latest to point at, so it is not
        // offered and the newest archive becomes the default.
        api.get.mockResolvedValue({
            data: { dates: ['20260707', '20260607'], latest: null, has_latest: false }
        });
        const { onChange } = renderSelector();
        await waitFor(() => expect(onChange).toHaveBeenCalledWith('20260707'));
        expect(screen.queryByRole('option', { name: /^Latest/ })).not.toBeInTheDocument();
        expect(screen.getByRole('option', { name: '2026-07-07' })).toBeInTheDocument();
    });

    test('still offers Latest for a current run that has no date of its own', async () => {
        // A hand-written log with no date header is undatable but still the
        // newest data, so Latest must be offered and must win by default -
        // defaulting to an archive here would quietly show staler data.
        api.get.mockResolvedValue({
            data: { dates: ['20250601'], latest: null, has_latest: true }
        });
        const { onChange } = renderSelector();
        await waitFor(() => expect(onChange).toHaveBeenCalledWith(''));
        expect(screen.getByRole('option', { name: 'Latest' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: '2025-06-01' })).toBeInTheDocument();
    });

    test('renders nothing when only the current run exists', async () => {
        api.get.mockResolvedValue({
            data: { dates: ['20260707'], latest: '20260707', has_latest: true }
        });
        const { onChange, container } = renderSelector();
        await waitFor(() => expect(onChange).toHaveBeenCalledWith(''));
        expect(container).toBeEmptyDOMElement();
    });

    test('renders nothing and asks for the latest when there are no runs at all', async () => {
        api.get.mockResolvedValue({ data: { dates: [], latest: null, has_latest: false } });
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

    test('tolerates a response with neither dates nor latest', async () => {
        api.get.mockResolvedValue({ data: {} });
        const { onChange } = renderSelector();
        await waitFor(() => expect(onChange).toHaveBeenCalledWith(''));
    });

    test('infers a current run from a date alone, for an API without has_latest', async () => {
        api.get.mockResolvedValue({ data: { dates: ['20260707', '20260607'], latest: '20260707' } });
        const { onChange } = renderSelector();
        await waitFor(() => expect(onChange).toHaveBeenCalledWith(''));
        expect(screen.getByRole('option', { name: 'Latest (2026-07-07)' })).toBeInTheDocument();
    });
});
