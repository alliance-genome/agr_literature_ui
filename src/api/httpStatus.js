// True for any 2xx HTTP status code (200-299). axios's default
// validateStatus already rejects non-2xx, so most call sites use this
// as belt-and-suspenders inside the success handler.
export function isSuccess(status) {
  return typeof status === 'number' && status >= 200 && status < 300;
}
