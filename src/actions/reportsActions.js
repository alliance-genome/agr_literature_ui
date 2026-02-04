
export const REPORTS_SET_DATE_RANGE_DICT = 'REPORTS_SET_DATE_RANGE_DICT';
export const REPORTS_SET_DATE_OPTION_DICT = 'REPORTS_SET_DATE_OPTION_DICT';
export const REPORTS_SET_DATE_FREQUENCY_DICT = 'REPORTS_SET_DATE_FREQUENCY_DICT';
export const REPORTS_SET_QCREPORT_OBSOLETE_ENTITIES = 'REPORTS_SET_QCREPORT_OBSOLETE_ENTITIES';
export const REPORTS_SET_QCREPORT_REDACTED_PAPERS = 'REPORTS_SET_QCREPORT_REDACTED_PAPERS';
export const REPORTS_SET_QCREPORT_DUPLICATE_ORCIDS = 'REPORTS_SET_QCREPORT_DUPLICATE_ORCIDS';

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

export const setQcreportObsoleteEntities = (qcReportObsoleteEntities) => ({
  type: REPORTS_SET_QCREPORT_OBSOLETE_ENTITIES,
  payload: {
    qcReportObsoleteEntities : qcReportObsoleteEntities
  }
});

export const setQcreportRecactedPapers = (qcReportRedactedPapers) => ({
  type: REPORTS_SET_QCREPORT_REDACTED_PAPERS,
  payload: {
    qcReportRedactedPapers : qcReportRedactedPapers
  }
});

export const setQcreportDuplicateOrcids = (qcReportDuplicateOrcids) => ({
  type: REPORTS_SET_QCREPORT_DUPLICATE_ORCIDS,
  payload: {
    qcReportDuplicateOrcids : qcReportDuplicateOrcids
  }
});

