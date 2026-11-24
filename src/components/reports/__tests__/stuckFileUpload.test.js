import { stuckFileUploadRows } from '../stuckFileUpload';

describe('stuckFileUploadRows', () => {
    const report = {
        'date-produced': '20261123',
        stuck_file_upload: {
            FB: [{
                reference_curie: 'AGRKB:101000001193283', pmid: 'PMID:40632140', pmcid: 'PMCID:PMC12240580',
                since: '2026-04-20', days: '217', has_nxml: 'Y', files: 'nXML, 4 figures'
            }, {
                reference_curie: 'AGRKB:101000000000001', pmid: '', pmcid: '',
                since: '2024-12-16', days: '707', has_nxml: 'N', files: '1 supplement'
            }]
        }
    };

    it('maps one MOD\'s rows, with days as a number for sorting', () => {
        expect(stuckFileUploadRows(report, 'FB')).toEqual([{
            reference_curie: 'AGRKB:101000001193283', pmid: 'PMID:40632140', pmcid: 'PMCID:PMC12240580',
            since: '2026-04-20', days: 217, has_nxml: 'Yes', files: 'nXML, 4 figures'
        }, {
            reference_curie: 'AGRKB:101000000000001', pmid: '', pmcid: '',
            since: '2024-12-16', days: 707, has_nxml: 'No', files: '1 supplement'
        }]);
    });

    it('returns null when the MOD has nothing in the report', () => {
        expect(stuckFileUploadRows(report, 'WB')).toBeNull();
    });

    it('returns null for an empty or failed report', () => {
        expect(stuckFileUploadRows({ 'date-produced': null }, 'FB')).toBeNull();
        expect(stuckFileUploadRows(null, 'FB')).toBeNull();
    });
});
