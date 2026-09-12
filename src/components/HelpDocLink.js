import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faQuestionCircle } from '@fortawesome/free-solid-svg-icons';
import LightTip from './LightTip';

// Curator help documentation on the LITERATURE Confluence space (SCRUM-6538).
// Central registry of curator doc URLs: some entries (validation, aiCuration)
// are not linked from the UI yet and are kept here for upcoming placements.
export const HELP_DOC_URLS = {
  topicEntityTagging: 'https://agr-jira.atlassian.net/wiki/spaces/LITERATURE/pages/760610818/Topic+and+Entity+Tagging',
  biblioEditor: 'https://agr-jira.atlassian.net/wiki/spaces/LITERATURE/pages/1460142082/Biblio+Editor+Tab+Help',
  abcReportsPage: 'https://agr-jira.atlassian.net/wiki/spaces/LITERATURE/pages/1337163777/ABC+Reports+Page',
  workflowStatistics: 'https://agr-jira.atlassian.net/wiki/spaces/LITERATURE/pages/1460535297/Workflow+Statistics',
  workflowDiagram: 'https://agr-jira.atlassian.net/wiki/spaces/LITERATURE/pages/1459945474/Workflow+Diagram',
  models: 'https://agr-jira.atlassian.net/wiki/spaces/LITERATURE/pages/1460404247/Models',
  qcObsoleteEntities: 'https://agr-jira.atlassian.net/wiki/spaces/LITERATURE/pages/1337262081/TET+Table+Deleted+or+Obsoleted+Entities',
  qcRetractedRefs: 'https://agr-jira.atlassian.net/wiki/spaces/LITERATURE/pages/1337327617/Retracted+References+with+Manual+Tags',
  qcObsoletePmids: 'https://agr-jira.atlassian.net/wiki/spaces/LITERATURE/pages/1337425921/PMIDs+obsoleted+this+month',
  qcDuplicateOrcids: 'https://agr-jira.atlassian.net/wiki/spaces/LITERATURE/pages/1337491457/Duplicate+ORCIDs',
  validation: 'https://agr-jira.atlassian.net/wiki/spaces/LITERATURE/pages/930021378/Validation',
  aiCuration: 'https://agr-jira.atlassian.net/wiki/spaces/LITERATURE/pages/543916033/AI+for+Literature+Curation'
};

// Small question-mark icon that opens the given help doc in a new tab.
const HelpDocLink = ({ url, title = 'Open help documentation', style = {} }) => {
  return (
    <LightTip tip={title}>
      <a href={url} target="_blank" rel="noopener noreferrer"
         aria-label={title} style={{ fontSize: '0.85em', verticalAlign: 'super', ...style }}
         onClick={(e) => e.stopPropagation()} >
        <FontAwesomeIcon icon={faQuestionCircle} />
      </a>
    </LightTip>
  );
};

export default HelpDocLink;
