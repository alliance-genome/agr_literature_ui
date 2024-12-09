
export const REPORTS_SET_DATE_DICT = 'REPORTS_SET_DATE_DICT';

const restUrl = process.env.REACT_APP_RESTAPI;

export const setDateDict = (newDate, workflowProcessAtpId, modSection) => ({
  type: REPORTS_SET_DATE_DICT,
  payload: {
    newDate : newDate,
    workflowProcessAtpId : workflowProcessAtpId,
    modSection : modSection
  }
});
