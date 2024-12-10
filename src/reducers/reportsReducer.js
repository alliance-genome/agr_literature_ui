import {
  REPORTS_SET_DATE_RANGE_DICT,
  REPORTS_SET_DATE_OPTION_DICT
} from '../actions/reportsActions';

import _ from "lodash";



const initialState = {
//   datePubmedAdded: "",
  dateRangeDict: {},
  dateOptionDict: {}
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
console.log(dateRangeDictCopy);
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
console.log(dateOptionDictCopy);
      return {
        ...state,
        dateOptionDict: dateOptionDictCopy
      }
    default:
      return state;
  }
}

