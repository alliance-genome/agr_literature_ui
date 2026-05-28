// Phase 0 of SCRUM-5716 API-output standardization.
//
// Lets the UI tolerate BOTH the legacy write-endpoint shapes (bare-int POST,
// bare-curie POST, 202 + {"message":"updated"} PATCH) and the planned
// strict-REST shapes (201 + full object + Location, 200 + full object) so
// the backend can migrate endpoint-by-endpoint without a coordinated deploy.

// True for any 2xx status code (200-299). Accepts both old (201/202/204) and
// new (200/201/204) strict-REST status codes for write endpoints.
export function isSuccess(status) {
  return typeof status === 'number' && status >= 200 && status < 300;
}

// Extract the id of a freshly-created resource from a POST response body,
// tolerating both the legacy bare-value shapes (bare int, bare quoted curie
// string) and the new full-object shape returned by `response_model=...SchemaShow`.
//
// data           res.data from a successful create call.
// expectedField  optional name of the id field on the new-object shape
//                (e.g. 'cross_reference_id'); when absent, falls back to
//                `curie`, then `id`, then legacy bare-value parsing.
export function extractCreatedId(data, expectedField) {
  if (data === null || data === undefined) {
    return null;
  }
  if (typeof data === 'object' && !Array.isArray(data)) {
    if (expectedField && data[expectedField] != null) {
      return data[expectedField];
    }
    if (data.curie != null) {
      return data.curie;
    }
    if (data.id != null) {
      return data.id;
    }
    return null;
  }
  if (typeof data === 'number') {
    return data;
  }
  if (typeof data === 'string') {
    const stripped = data.replace(/^"|"$/g, '');
    return /^-?\d+$/.test(stripped) ? parseInt(stripped, 10) : stripped;
  }
  return null;
}
