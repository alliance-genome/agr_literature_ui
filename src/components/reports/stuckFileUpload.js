// Rows for the "Stuck at file upload in progress" QC report (SCRUM-6941).
// The API (/check/check_stuck_file_upload) returns every field as text; days becomes a
// number so the column sorts numerically, and has_nxml a readable Yes/No.
export const stuckFileUploadRows = (report, modSection) => {
  const byMod = report && report.stuck_file_upload;
  if (!byMod || !(modSection in byMod)) {
    return null;
  }
  return byMod[modSection].map(item => ({
    reference_curie: item.reference_curie,
    pmid: item.pmid,
    pmcid: item.pmcid,
    since: item.since,
    days: Number(item.days),
    has_nxml: item.has_nxml === 'Y' ? 'Yes' : 'No',
    files: item.files
  }));
};
