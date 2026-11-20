// Collapse an axios error from the ABC API into a plain string.
//
// The message must end up a string. Consumers render it straight into JSX and some
// call .includes() on it, so a non-string detail would throw "Objects are not valid
// as a React child" and take the alert down with it -- swallowing the very error it
// was meant to show. FastAPI's own HTTPExceptions send a string, but a
// request-validation 422 sends a list of {loc, msg, type}, so collapse that too.
export const apiErrorMessage = (subPath, error) => {
  const detail = error.response?.data?.detail;
  if (typeof detail === 'string' && detail !== '') { return detail; }
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0];
    if (first && typeof first.msg === 'string') {
      const where = Array.isArray(first.loc) ? first.loc[first.loc.length - 1] : '';
      return 'error: ' + subPath + ' : ' + first.msg + (where ? ': ' + where : '');
    }
  }
  if (detail) { return 'error: ' + subPath + ' : ' + JSON.stringify(detail); }
  return 'error: ' + subPath + ' : ' + error.message;
};
