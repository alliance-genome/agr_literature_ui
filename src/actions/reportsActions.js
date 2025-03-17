
export const REPORTS_SET_DATE_RANGE_DICT = 'REPORTS_SET_DATE_RANGE_DICT';
export const REPORTS_SET_DATE_OPTION_DICT = 'REPORTS_SET_DATE_OPTION_DICT';
export const REPORTS_SET_DATE_FREQUENCY_DICT = 'REPORTS_SET_DATE_FREQUENCY_DICT';

const restUrl = process.env.REACT_APP_RESTAPI;

export const setDateRangeDict = (newDateRange, workflowProcessAtpId, modSection) => ({
  type: REPORTS_SET_DATE_RANGE_DICT,
  payload: {
    newDateRange : newDateRange,
    workflowProcessAtpId : workflowProcessAtpId,
    modSection : modSection
  }
});

export const setDateOptionDict = (newDateOption, workflowProcessAtpId, modSection) => ({
  type: REPORTS_SET_DATE_OPTION_DICT,
  payload: {
    newDateOption : newDateOption,
    workflowProcessAtpId : workflowProcessAtpId,
    modSection : modSection
  }
});

export const setDateFrequencyDict = (newDateFrequency, workflowProcessAtpId, modSection) => ({
  type: REPORTS_SET_DATE_FREQUENCY_DICT,
  payload: {
    newDateFrequency : newDateFrequency,
    workflowProcessAtpId : workflowProcessAtpId,
    modSection : modSection
  }
});
