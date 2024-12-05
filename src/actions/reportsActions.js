
export const REPORTS_SET_DATE_FILE_UPLOAD = 'REPORTS_SET_DATE_FILE_UPLOAD';

const restUrl = process.env.REACT_APP_RESTAPI;

export const setDateFileUpload = (dateFileUpload) => ({
  type: REPORTS_SET_DATE_FILE_UPLOAD,
  payload: {
    dateFileUpload : dateFileUpload
  }
});
