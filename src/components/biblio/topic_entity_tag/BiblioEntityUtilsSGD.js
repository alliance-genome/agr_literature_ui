export const sgdTopicList = [{'curie': 'ATP:0000012', 'name': 'gene ontology'},
			     {'curie': 'ATP:0000079', 'name': 'classical phenotype information'},
			     {'curie': 'ATP:0000129', 'name': 'headline information'},
			     {'curie': 'ATP:0000128', 'name': 'protein containing complex'},
			     {'curie': 'other primary information', 'name': 'other primary information'},
			     {'curie': 'ATP:0000085', 'name': 'high throughput phenotype assay'},
			     {'curie': 'ATP:0000150', 'name': 'other HTP data (OMICs)'},
			     {'curie': 'review',      'name': 'review'},
			     {'curie': 'ATP:0000011', 'name': 'homology/disease'},
			     {'curie': 'ATP:0000088', 'name': 'post translational modification'},
			     {'curie': 'ATP:0000070', 'name': 'regulation information'},
			     {'curie': 'ATP:0000022', 'name': 'pathways'},
			     {'curie': 'ATP:0000149', 'name': 'metabolic engineering'},
			     {'curie': 'ATP:0000054', 'name': 'gene model'},
			     {'curie': 'ATP:0000006', 'name': 'allele'},
			     {'curie': 'other additional literature', 'name': 'other additional literature'}];
			  
/*
   ATP:0000128: protein containing complex
   ATP:0000012: gene ontology
   ATP:0000079: Classical phenotype information
   ATP:0000129: Headline information
   'other primary literature': place holder for other primary literature
*/
const sgdPrimaryTopics = ['ATP:0000128', 'ATP:0000012', 'ATP:0000079', 'ATP:0000129',
			  'other primary information'];
const primaryDisplay = 'ATP:0000147';
    
/*
   ATP:0000085: high throughput phenotype assay
   ATP:0000150: Other HTP data (OMICs)’
*/
const sgdOmicsTopics = ['ATP:0000085', 'ATP:0000150'];
const omicsDisplay = 'ATP:0000148';
      
/* 
   ATP:0000011: Homology/Disease
   ATP:0000088: post translational modification
   ATP:0000070: regulatory interaction
   ATP:0000022: pathway
   ATP:0000149: metabolic engineering
   ATP:0000054: gene model
   ATP:0000006: allele
   'other additional literature': placeholder for 'other additional literature'
*/  
const sgdAdditionalTopics = ['ATP:0000142', 'ATP:0000011', 'ATP:0000088', 'ATP:0000070',
			     'ATP:0000022', 'ATP:0000149', 'ATP:0000054', 'ATP:0000006',
			     'other additional literature'];
const additionalDisplay = 'ATP:0000132';

/* place holder for review topic */
const sgdReviewTopic = 'review';  
const reviewDisplay = 'ATP:0000130';
  
export function setDisplayTag(topicSelect) {
  if (sgdPrimaryTopics.includes(topicSelect)) {
    return primaryDisplay;
  }
  if (sgdOmicsTopics.includes(topicSelect)) {
    return omicsDisplay;
  }
  if (sgdAdditionalTopics.includes(topicSelect)) {
    return additionalDisplay;
  }
  if (topicSelect === sgdReviewTopic) {
    return reviewDisplay;
  }
  return '';
}

export function checkTopicEntitySetDisplayTag(entityText, entityResultList, topicSelect) {

  /*
     -------------------------------------------
     displayTag = 'primary display', ATP:0000147
     -------------------------------------------  
  */
  const isPrimaryTopic = sgdPrimaryTopics.includes(topicSelect);  
  const isEntityEmpty = !entityText || entityText.trim() === '';
  let isEntityInvalid = false;
  if ( entityResultList && entityResultList.length > 0 ) {
    for (let entityResult of entityResultList.values()) {
      if (entityResult.curie === 'no Alliance curie') {
        isEntityInvalid = true;
	break;
      }
    }
  }
  if (isPrimaryTopic) {
    if (isEntityEmpty || isEntityInvalid) {
      return ["This topic requires the inclusion of a valid gene or entity.", false];
    }
    return [false, primaryDisplay];
  }

  /*
     -----------------------------------------
     displayTag = 'OMICs display', ATP:0000148
     -----------------------------------------
  */
  if (sgdOmicsTopics.includes(topicSelect)) {
    if (isEntityEmpty === false) {
      return ["HTP topics do not require genes or entities", false];
    }
    return [false, omicsDisplay];
  }

  /*
     -----------------------------------------------------------------
     displayTag = 'additional display', ATP:0000132 if there is entity
     -----------------------------------------------------------------
  */
  if (sgdAdditionalTopics.includes(topicSelect)) {
    if (isEntityEmpty) { // no gene/entity => no displayTag
      return [false, ''];
    }
    else if (isEntityInvalid) {
      return ["The addition of entities are not required for this topic, but if associated they must be valid genes or entities", false];
    }
    return [false, additionalDisplay];
  }

  /*
     -------------------------------------------------------------------
     displayTag = 'review display', ATP:0000130
     -------------------------------------------------------------------
  */
  if (topicSelect === sgdReviewTopic) {
    if (isEntityEmpty) {
      return [false, reviewDisplay];
    }
    else if (isEntityInvalid) {
      return ["Entities are optional for papers assigned as reviews, but when associated they must be valid genes or entities", false];
    }
    else {
      return [false, reviewDisplay];
    }
  }
  //return ['You select an unknown topic for SGD. Please make the necessary correction.', false]
  return ['Pick a topic!', false]  
}
