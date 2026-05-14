import React from 'react';
import { useSelector } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilePdf, faPenSquare } from '@fortawesome/free-solid-svg-icons';
import { api } from '../../../api';

const prefixOf = (curie) =>
  curie ? String(curie).split(':')[0].toUpperCase() : null;

/** Same precedence the search results list uses (SearchResults.determineUrl):
 *  cross_reference.pages[0].url > cross_reference.url > null. */
function determineXrefUrl(xrefCurie, crossReferenceResults) {
  const meta = crossReferenceResults?.[xrefCurie];
  if (!meta) return null;
  if (Array.isArray(meta.pages) && meta.pages.length > 0) {
    return meta.pages[0].url;
  }
  return meta.url || null;
}

function pubmedFallback(pmidCurie) {
  const num = pmidCurie?.split(':')[1];
  return num ? `https://pubmed.ncbi.nlm.nih.gov/${num}/` : null;
}

function ExternalIdLink({ curie, href, className }) {
  if (!href) return <span className={className}>{curie}</span>;
  return (
    <a
      className={className}
      href={href}
      target="_blank"
      rel="noreferrer noopener"
    >
      {curie}
    </a>
  );
}

/** Open the main PDF for a reference in a new tab. Mirrors the
 *  SearchResults list-view FileDownloadIcon flow. */
function downloadMainPdf(referencefileId) {
  api
    .get(`/reference/referencefile/download_file/${referencefileId}`, {
      responseType: 'blob',
    })
    .then((response) => {
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const pdfUrl = window.URL.createObjectURL(blob);
      window.open(pdfUrl, '_blank');
    });
}

export default function IdsCell(params) {
  const r = params.data?.biblio || {};
  const curie = params.data?.curie;
  // selectedPrefixes: null = no filter (show everything),
  // [] = nothing selected, [subset] = only those prefixes are shown.
  const selected = params.colDef?.cellRendererParams?.selectedPrefixes;
  const crossReferenceResults = useSelector(
    (s) => s.search?.crossReferenceResults
  );
  const isSignedIn = useSelector((s) => s.isLogged?.isSignedIn);
  const curiePDFIDsMap = useSelector((s) => s.search?.curiePDFIDsMap);
  const mainPdfId = curie ? curiePDFIDsMap?.[curie] : null;

  const allowed = (p) => {
    if (selected === null || selected === undefined) return true;
    if (!Array.isArray(selected)) return true;
    return selected.includes(p);
  };

  const showCurie = curie && allowed(prefixOf(curie));
  const xrefs = (r.cross_references || [])
    .map((x) => x.curie)
    .filter((c) => c && allowed(prefixOf(c)));
  // Stable display order: PMID first, then everything else in original order.
  const pmid = xrefs.find((c) => c.startsWith('PMID:'));
  const otherXrefs = xrefs.filter((c) => !c.startsWith('PMID:'));

  const showTetIcon = curie && isSignedIn;
  const showPdfIcon = Boolean(mainPdfId);

  return (
    <div className="tetv-ids-cell">
      {showCurie && (
        <div className="tetv-ref-curie">
          <a
            href={`/Biblio?action=display&referenceCurie=${encodeURIComponent(curie)}`}
            target="_blank"
            rel="noreferrer noopener"
          >
            {curie}
          </a>
        </div>
      )}
      {pmid && (
        <div className="tetv-ref-pmid">
          <ExternalIdLink
            curie={pmid}
            href={
              determineXrefUrl(pmid, crossReferenceResults) ||
              pubmedFallback(pmid)
            }
          />
        </div>
      )}
      {otherXrefs.map((c) => (
        <div key={c} className="tetv-ref-xref">
          <ExternalIdLink
            curie={c}
            href={determineXrefUrl(c, crossReferenceResults)}
          />
        </div>
      ))}
      {(showTetIcon || showPdfIcon) && (
        <div className="tetv-ref-actions">
          {showTetIcon && (
            <a
              className="tetv-ref-action tetv-ref-action-tet"
              href={`/Biblio/?action=entity&referenceCurie=${encodeURIComponent(curie)}`}
              target="_blank"
              rel="noreferrer noopener"
              title="Open in the TET editor"
              aria-label="Open in the TET editor"
            >
              <FontAwesomeIcon icon={faPenSquare} />
              <span className="tetv-ref-action-label">TET</span>
            </a>
          )}
          {showPdfIcon && (
            <button
              type="button"
              className="tetv-ref-action tetv-ref-action-pdf"
              onClick={() => downloadMainPdf(mainPdfId)}
              title="Open main PDF"
              aria-label="Open main PDF"
            >
              <FontAwesomeIcon icon={faFilePdf} />
              <span className="tetv-ref-action-label">PDF</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
