import {
  REPORTS_SET_DATE_DICT
} from '../actions/reportsActions';

import _ from "lodash";



const initialState = {
//   datePubmedAdded: "",
  dateDict: {}
};

// to ignore a warning about Unexpected default export of anonymous function
// eslint-disable-next-line
export default function(state = initialState, action) {
  // action will have a type.  common to evaluate with a switch
  switch (action.type) {
    case REPORTS_SET_DATE_DICT:
      console.log('reducer REPORTS_SET_DATE_DICT');
      console.log(action.payload.newDate);
      console.log(action.payload.modSection);
      const dateDictCopy = _.cloneDeep(state.dateDict);
      if (!dateDictCopy[action.payload.modSection]) { dateDictCopy[action.payload.modSection] = {}; }
      dateDictCopy[action.payload.modSection][action.payload.workflowProcessAtpId] = action.payload.newDate;
      return {
        ...state,
        dateDict: dateDictCopy
      }
    default:
      return state;
  }
}

