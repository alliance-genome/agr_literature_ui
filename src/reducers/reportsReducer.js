import {
  REPORTS_SET_DATE_FILE_UPLOAD
} from '../actions/reportsActions';

import _ from "lodash";



const initialState = {
//   datePubmedAdded: "",
  dateFileUpload: ""
};

// to ignore a warning about Unexpected default export of anonymous function
// eslint-disable-next-line
export default function(state = initialState, action) {
  // action will have a type.  common to evaluate with a switch
  switch (action.type) {
    case REPORTS_SET_DATE_FILE_UPLOAD:
      return {
        ...state,
        dateFileUpload: action.payload.dateFileUpload
      }
    default:
      return state;
  }
}

