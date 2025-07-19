import {
  REPORTS_SET_DATE_RANGE_DICT,
  REPORTS_SET_DATE_OPTION_DICT,
  REPORTS_SET_DATE_FREQUENCY_DICT,
  REPORTS_SET_QCREPORT_OBSOLETE_ENTITIES,
  REPORTS_SET_QCREPORT_REDACTED_PAPERS,
  REPORTS_SET_QCREPORT_DUPLICATE_ORCIDS
} from '../actions/reportsActions';

import _ from "lodash";



const initialState = {
//   datePubmedAdded: "",
  dateRangeDict: {},
  dateOptionDict: {},
  dateFrequencyDict: {},
  qcReportObsoleteEntities: { 'date-produced': null, 'obsolete_entities': null },
  qcReportRedactedPapers: {'date-produced': null, 'redacted-references': null},
  qcReportDuplicateOrcids: { 'date-produced': null, 'duplicate_orcids': null },
};

// to ignore a warning about Unexpected default export of anonymous function
// eslint-disable-next-line
export default function(state = initialState, action) {
  // action will have a type.  common to evaluate with a switch
  switch (action.type) {
    case REPORTS_SET_DATE_RANGE_DICT:
      console.log('reducer REPORTS_SET_DATE_RANGE_DICT');
      console.log(action.payload.newDateRange);
      console.log(action.payload.modSection);
      const dateRangeDictCopy = _.cloneDeep(state.dateRangeDict);
      if (!dateRangeDictCopy[action.payload.modSection]) { dateRangeDictCopy[action.payload.modSection] = {}; }
      dateRangeDictCopy[action.payload.modSection][action.payload.workflowProcessAtpId] = action.payload.newDateRange;
      return {
        ...state,
        dateRangeDict: dateRangeDictCopy
      }
    case REPORTS_SET_DATE_OPTION_DICT:
      console.log('reducer REPORTS_SET_DATE_OPTION_DICT');
      console.log(action.payload.newDateOption);
      console.log(action.payload.workflowProcessAtpId);
      console.log(action.payload.modSection);
      const dateOptionDictCopy = _.cloneDeep(state.dateOptionDict);
      if (!dateOptionDictCopy[action.payload.modSection]) { dateOptionDictCopy[action.payload.modSection] = {}; }
      dateOptionDictCopy[action.payload.modSection][action.payload.workflowProcessAtpId] = action.payload.newDateOption;
      return {
        ...state,
        dateOptionDict: dateOptionDictCopy
      }
    case REPORTS_SET_DATE_FREQUENCY_DICT:
      console.log('reducer REPORTS_SET_DATE_FREQUENCY_DICT');
      console.log(action.payload.newDateFrequency);
      console.log(action.payload.workflowProcessAtpId);
      console.log(action.payload.modSection);
      const dateFrequencyDictCopy = _.cloneDeep(state.dateFrequencyDict);
      if (!dateFrequencyDictCopy[action.payload.modSection]) { dateFrequencyDictCopy[action.payload.modSection] = {}; }
      dateFrequencyDictCopy[action.payload.modSection][action.payload.workflowProcessAtpId] = action.payload.newDateFrequency;
      return {
        ...state,
        dateFrequencyDict: dateFrequencyDictCopy
      }
    case REPORTS_SET_QCREPORT_OBSOLETE_ENTITIES:
      console.log('reducer REPORTS_SET_QCREPORT_DICT');
      console.log(action.payload.qcReportObsoleteEntities);
      return {
        ...state,
        qcReportObsoleteEntities: action.payload.qcReportObsoleteEntities
      }
    case REPORTS_SET_QCREPORT_REDACTED_PAPERS:
      return {
        ...state,
        qcReportRedactedPapers: action.payload.qcReportRedactedPapers
      }
    case REPORTS_SET_QCREPORT_DUPLICATE_ORCIDS:
      return {
        ...state,
        qcReportDuplicateOrcids: action.payload.qcReportDuplicateOrcids
      }
    default:
      return state;
  }
}

