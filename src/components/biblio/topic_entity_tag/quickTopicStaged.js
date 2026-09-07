/** Tiny shared flag so the Biblio tab-switch radios can warn when Quick Topic
 *  Addition has staged (not-yet-submitted) assessments. QuickTopicAddition is a
 *  sibling of the mode toggler (they only share redux), so a module-level count
 *  is the simplest way to bridge them without prop-drilling. */
let stagedCount = 0;

export const setQuickTopicStagedCount = (n) => { stagedCount = Number(n) || 0; };
export const getQuickTopicStagedCount = () => stagedCount;
