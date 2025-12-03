// import { Link } from 'react-router-dom'
// import { useHistory } from "react-router-dom";
import axios from "axios";
import { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from 'react-redux';

import { changeFieldInput } from '../actions/mergeActions';
import { changeFieldTetCheckbox } from '../actions/mergeActions';
import { mergeQueryReferences } from '../actions/mergeActions';
import { mergeResetReferences } from '../actions/mergeActions';
import { mergeSwapKeep } from '../actions/mergeActions';
import { mergeSwapKeepPmid } from '../actions/mergeActions';
import { mergeSwapPairSimple } from '../actions/mergeActions';
import { mergeToggleIndependent } from '../actions/mergeActions';
import { mergeButtonApiDispatch } from '../actions/mergeActions';
import { setMergeUpdating } from '../actions/mergeActions';
import { setMergeCompleting } from '../actions/mergeActions';
import { setDataTransferHappened } from '../actions/mergeActions';
import { setShowDataTransferModal } from '../actions/mergeActions';
// import { setCompletionMergeHappened } from '../actions/mergeActions';
import { closeMergeUpdateAlert } from '../actions/mergeActions';
import { mergeQueryAtp } from '../actions/mergeActions';

import { splitCurie } from './biblio/BiblioEditor';
import { comcorMapping } from './biblio/BiblioEditor';

import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button'
import Badge from 'react-bootstrap/Badge'
import Alert from 'react-bootstrap/Alert'
import Tooltip from 'react-bootstrap/Tooltip'
import OverlayTrigger from 'react-bootstrap/OverlayTrigger'
import {Spinner} from "react-bootstrap";
import {Modal} from "react-bootstrap";

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faExchangeAlt } from '@fortawesome/free-solid-svg-icons'
import { faLock } from '@fortawesome/free-solid-svg-icons'
import { faLockOpen } from '@fortawesome/free-solid-svg-icons'
// import { faLongArrowAltLeft } from '@fortawesome/free-solid-svg-icons'


const RowDivider = () => { return (<Row><Col>&nbsp;</Col></Row>); }

const fieldsSimple = ['curie', 'reference_id', 'title', 'category', 'citation', 'volume', 'page_range', 'language', 'abstract', 'plain_language_abstract', 'publisher', 'issue_name', 'date_published', 'date_arrived_in_pubmed', 'date_last_modified_in_pubmed', 'resource_curie', 'resource_title' ];
const fieldsPubmedArrayString = ['keywords', 'pubmed_abstract_languages', 'pubmed_types' ];

const fieldsOrdered = [ 'title', 'DIVIDER', 'mod_corpus_associations', 'DIVIDER', 'cross_references', 'DIVIDER', 'reference_relations', 'DIVIDER', 'authors', 'DIVIDER', 'abstract', 'pubmed_abstract_languages', 'plain_language_abstract', 'DIVIDER', 'category', 'pubmed_types', 'mod_reference_types', 'prepublication_pipeline', 'DIVIDER', 'resource_curie', 'resource_title', 'volume', 'issue_name', 'page_range', 'DIVIDER', 'publisher', 'language', 'DIVIDER', 'date_published', 'date_arrived_in_pubmed', 'date_last_modified_in_pubmed', 'DIVIDER', 'keywords', 'mesh_terms', 'DIVIDER', 'reference_files', 'DIVIDER', 'workflow_tags', 'DIVIDER', 'topic_entity_tags' ];
// const fieldsOrdered = [ 'title', 'mod_corpus_associations', 'cross_references', 'reference_relations', 'authors', 'DIVIDER', 'abstract', 'pubmed_abstract_languages', 'plain_language_abstract', 'DIVIDER', 'category', 'pubmed_types', 'mod_reference_types', 'DIVIDER', 'resource_curie', 'resource_title', 'volume', 'issue_name', 'page_range', 'DIVIDER', 'editors', 'publisher', 'language', 'DIVIDER', 'date_published', 'date_arrived_in_pubmed', 'date_last_modified_in_pubmed', 'DIVIDER', 'tags', 'DIVIDER', 'keywords', 'mesh_terms' ];
// const fieldsOrdered = [ 'title', 'mod_corpus_associations', 'cross_references', 'reference_relations', 'authors', 'DIVIDER', 'citation', 'abstract', 'pubmed_abstract_languages', 'plain_language_abstract', 'DIVIDER', 'category', 'pubmed_types', 'mod_reference_types', 'DIVIDER', 'resource_curie', 'resource_title', 'volume', 'issue_name', 'page_range', 'DIVIDER', 'editors', 'publisher', 'language', 'DIVIDER', 'date_published', 'date_arrived_in_pubmed', 'date_last_modified_in_pubmed', 'DIVIDER', 'tags', 'DIVIDER', 'keywords', 'mesh_terms' ];

// const fieldsPubmed = [ 'title', 'reference_relations', 'authors', 'abstract', 'pubmed_types', 'resource_curie', 'resource_title', 'volume', 'issue_name', 'page_range', 'editors', 'publisher', 'language', 'date_published', 'date_arrived_in_pubmed', 'date_last_modified_in_pubmed', 'keywords', 'mesh_terms', 'pubmed_abstract_languages', 'plain_language_abstract' ];

const fieldsNoLock = [ 'mod_corpus_associations', 'cross_references', 'mod_reference_types' ];
const fieldsPubmedUnlocked = [ 'authors', 'category', 'resource_curie', 'date_published' ];
const fieldsPubmedLocked = [ 'title', 'abstract', 'volume', 'issue_name', 'page_range', 'publisher', 'language' ];
const fieldsPubmedOnly = [ 'correction', 'pubmed_types', 'date_arrived_in_pubmed', 'date_last_modified_in_pubmed', 'mesh_terms', 'pubmed_abstract_languages', 'plain_language_abstract', 'keywords', 'reference_relations' ];
// const fieldsDisplayOnly = [ 'citation', 'pubmed_types', 'resource_title', 'date_arrived_in_pubmed', 'date_last_modified_in_pubmed', 'mesh_terms', 'pubmed_abstract_languages', 'plain_language_abstract' ];

const GenerateFieldLabel = (fieldName, isLocked) => {
  const renderTooltipLock = ( <Tooltip id="lock-tooltip" > Data in this field cannot be manually changed during a merge. </Tooltip> );
  const renderTooltipUnlock = ( <Tooltip id="unlock-tooltip" > Data in this field is tied to the PMID, but may be manually changed during a merge. </Tooltip> );
  if ( isLocked === 'lock' ) { 
    return (<div className={`div-merge div-merge-grey`}> 
      <OverlayTrigger placement="right" delay={{ show: 250, hide: 400 }} overlay={renderTooltipLock} >
        <FontAwesomeIcon icon={faLock} />
      </OverlayTrigger> {fieldName}</div>); }
  else if ( isLocked === 'unlock' ) { 
    return (<div className={`div-merge div-merge-grey`}> 
      <OverlayTrigger placement="right" delay={{ show: 250, hide: 400 }} overlay={renderTooltipUnlock} >
        <FontAwesomeIcon icon={faLockOpen} />
      </OverlayTrigger> {fieldName}</div>); }
  return (<div className={`div-merge div-merge-grey`}>{fieldName}</div>);
}

const GenerateIsLocked = (fieldName, hasPmid) => {
  if ( (fieldsPubmedOnly.includes(fieldName)) || ( (hasPmid) && (fieldsPubmedLocked.includes(fieldName)) ) ) { 
    return 'lock'; }
  else if ( (hasPmid) && (fieldsPubmedUnlocked.includes(fieldName)) ) {
    return 'unlock'; }
  else if (fieldsNoLock.includes(fieldName)) {
    return 'nolock'; }
  return 'nolock';
}

const MergeSelectionSection = () => {
  const dispatch = useDispatch();
  const isLoadingReferences = useSelector(state => state.merge.isLoadingReferences);
  const pmidKeepReference = useSelector(state => state.merge.pmidKeepReference);
  const referenceMeta1 = useSelector(state => state.merge.referenceMeta1);
  const referenceMeta2 = useSelector(state => state.merge.referenceMeta2);
  const referenceSwap = useSelector(state => state.merge.referenceSwap);
  const queryDoubleSuccess = useSelector(state => state.merge.queryDoubleSuccess);
  const hasPmid = useSelector(state => state.merge.hasPmid);

  const dataTransferHappened = useSelector(state => state.merge.dataTransferHappened);
  const mergeTransferringCount = useSelector(state => state.merge.mergeTransferringCount);
  const completionMergeHappened = useSelector(state => state.merge.completionMergeHappened);
  const mergeCompletingCount = useSelector(state => state.merge.mergeCompletingCount);

  const accessToken = useSelector(state => state.isLogged.accessToken);
  const ateamResults = useSelector(state => state.merge.ateamResults);
  const atpParents = useSelector(state => state.merge.atpParents);

  // for paper lock check
  const [showLockModal, setShowLockModal] = useState(false);
  const [remainingTime, setRemainingTime] = useState(120);
  const [canMerge, setCanMerge] = useState(false);
  const [timeoutOccurred, setTimeoutOccurred] = useState(false);
  const lockedCuriesRef = useRef([]);
  const remainingTimeRef = useRef(120);
  const countdownIntervalRef = useRef(null);
  const pollIntervalRef = useRef(null);
  const [lockMessages, setLockMessages] = useState({});  
  const [lockedCuries, setLockedCuries] = useState([]);
  
  
  // initiates the process of checking whether either paper is locked
  // when both references are successfully queried
  useEffect(() => {
    if (queryDoubleSuccess) {
      checkLockStatus();
    }
  }, [queryDoubleSuccess]);

  // cleanup timers whenever the component unmounts
  // make sure that there are no leftover intervals running in the background
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const checkLockStatus = async () => {
    const ref1 = referenceMeta1.input;
    const ref2 = referenceMeta2.input;
    try {
      console.log("Checking lock status for ", ref1, ref2);  
      const responses = await Promise.all([
        axios.get(`${process.env.REACT_APP_RESTAPI}/reference/lock_status/${ref1}`),
        axios.get(`${process.env.REACT_APP_RESTAPI}/reference/lock_status/${ref2}`)
      ]);
      const lockedRefs = [];
      const messages = {};
      responses.forEach((response, index) => {
        const curie = index === 0 ? ref1 : ref2;
        if (response.data.locked) {
          lockedRefs.push(curie);
          messages[curie] = response.data.message;
        }
      });
      if (lockedRefs.length > 0) {
	setShowLockModal(true);
        setLockedCuries(lockedRefs);
	lockedCuriesRef.current = lockedRefs; 
        setLockMessages(messages);
	startCountdown();
	setCanMerge(false);
      } else {
	setCanMerge(true);  
      }	  
    } catch (error) {
      console.error("Error checking lock status:", error);
      setCanMerge(false);
    }
  };
    
  const startCountdown = () => {
    const initialTime = 120;
    setRemainingTime(initialTime);
    remainingTimeRef.current = initialTime;
    setTimeoutOccurred(false);

    // start the countdown timer:
    countdownIntervalRef.current = setInterval(() => {
      const newTime = remainingTimeRef.current - 1;
      remainingTimeRef.current = newTime;
      setRemainingTime(newTime);
      if (newTime <= 0) {
	// clears this interval so that the timer stops
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    }, 1000);

    // start the polling interval (every 10 seconds):
    pollIntervalRef.current = setInterval(async () => {
      // clears the polling interval and stops further execution
      if (remainingTimeRef.current <= 0) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null; 
        return;
      }

      // copies the current locked references from lockedCuriesRef.current
      // so can check each of them again to see if it is unlocked	
      const currentLocked = [...lockedCuriesRef.current];
      const stillLocked = await checkLocksAgain(currentLocked);
      lockedCuriesRef.current = stillLocked;
      setLockedCuries(stillLocked);

      if (stillLocked.length === 0) {
        // For each paper that was locked, update its message.
        currentLocked.forEach(curie => {
          setLockMessages(prev => ({
            ...prev,
            [curie]: `The paper ${curie} is unlocked. You can start merging now.`
          }));
        });

	  
        // delay closing the modal so the message remains visible.
        setTimeout(() => {
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          setShowLockModal(false);
          setCanMerge(true);
        }, 300000); // will close automatically in 5min 
      }
    }, 10000);
  };
 
  const checkLocksAgain = async (curies = []) => {
    try {
      const responses = await Promise.all(
        curies.map(curie =>
          axios.get(`${process.env.REACT_APP_RESTAPI}/reference/lock_status/${curie}`)
            .catch(() => ({ data: { locked: true } }))
        ) 
      );
      const stillLocked = [];
      responses.forEach((response, index) => {
        const curie = curies[index];
        if (response.data.locked) {
          stillLocked.push(curie);
        }
	else {
          setLockMessages(prev => ({
            ...prev,
            [curie]: `The paper ${curie} is unlocked. You can start merging now.`
          }));
        }
      });
  
      return stillLocked;
    } catch (error) {
      console.error("Error rechecking lock status:", error);
      return curies;
    }
	  
  };


  // swap icon fa-exchange
  // left arrow icon fa-arrow-left 
  // <FontAwesomeIcon size='lg' icon={faLongArrowAltLeft} />

  let header1 = (<span className={`span-merge-header-success`} >Keep</span>)
  let header2 = (<span className={`span-merge-header-failure`} >Obsolete</span>)
  // if (keepReference === 2) {
  //   header2 = (<span className={`span-merge-header-success`} >Keep</span>)
  //   header1 = (<span className={`span-merge-header-failure`} >Obsolete</span>) }

  let curie1Class = 'span-merge-message-init';
  if (referenceMeta1.queryRefSuccess === null) { curie1Class = 'span-merge-message-init'; }
    else if (referenceMeta1.queryRefSuccess === true) { curie1Class = 'span-merge-message-success'; }
    else if (referenceMeta1.queryRefSuccess === false) { curie1Class = 'span-merge-message-failure'; }
  let curie2Class = 'span-merge-message-init';
  if (referenceMeta2.queryRefSuccess === null) { curie2Class = 'span-merge-message-init'; }
    else if (referenceMeta2.queryRefSuccess === true) { curie2Class = 'span-merge-message-success'; }
    else if (referenceMeta2.queryRefSuccess === false) { curie2Class = 'span-merge-message-failure'; }
  
  if ( (ateamResults === 0) && (accessToken) ) {
    dispatch(mergeQueryAtp(accessToken, atpParents));
  }

  return (
    <>
    <Container>
      <Row>
        <Col sm="5" >{header1}<br/>
          <Form.Control as="input" id="referenceMeta1.input" value={referenceMeta1.input} disabled={referenceMeta1.disableInput} onChange={(e) => dispatch(changeFieldInput(e, 'referenceMeta1', 'input'))} />
          <span className={curie1Class} >{referenceMeta1.message}</span>
        </Col>
        <Col sm="2" ><br/>
          <Button onClick={(e) => dispatch(mergeSwapKeep())}>Swap <FontAwesomeIcon icon={faExchangeAlt} /></Button>
        </Col>
        <Col sm="5" >{header2}<br/>
          <Form.Control as="input" id="referenceMeta2.input" value={referenceMeta2.input} disabled={referenceMeta2.disableInput} onChange={(e) => dispatch(changeFieldInput(e, 'referenceMeta2', 'input'))} />
          <span className={curie2Class} >{referenceMeta2.message}</span>
        </Col>
      </Row>
      <Row>
        <Col sm="12" >
          {(() => {
            if (queryDoubleSuccess) { 
              return (<>
                        <Button variant='warning' onClick={() => dispatch(mergeResetReferences())} >Discard changes and new query</Button>&nbsp;
                        <Button variant='warning' onClick={(e) => dispatch(mergeQueryReferences(referenceMeta2.input, referenceMeta1.input, true))} >Swap and Start Over</Button>
                      </>) }
            return (<Button variant='primary' onClick={(e) => dispatch(mergeQueryReferences(referenceMeta1.input, referenceMeta2.input, false))} >
              {isLoadingReferences ? <Spinner animation="border" size="sm"/> : "Query for these references"}</Button>);
          })()}
        </Col>
      </Row>
      <RowDivider />
      <RowDivider />
    </Container>

    {/* Lock Status Modal */}
    <Modal
      show={showLockModal}
      onHide={() => {
        if (timeoutOccurred || lockedCuries.length === 0) {
          setShowLockModal(false);
        }
      }} 
      backdrop="static"
    >	  
      <Modal.Header closeButton={timeoutOccurred || lockedCuries.length === 0}>
        <Modal.Title>Paper Lock Status</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {lockedCuries.length > 0 ? (
          lockedCuries.map(curie => (
            <div key={curie} className="mb-3">
              <div>{lockMessages[curie]}</div>
              <div className="mt-2">
                {remainingTimeRef.current > 0 ? (
                  <>
                    <Spinner animation="border" size="sm" />
                    <span className="ms-2">
                      Rechecking in {Math.floor(remainingTimeRef.current / 60)}m{" "}
                      {remainingTimeRef.current % 60}s
                    </span>
                 </>
                ) : (
	          <span className="ms-2">
                    The paper {curie} is still locked. Please check back later.
	          </span>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="mb-3">
            {Object.keys(lockMessages).map(curie => (
              <div key={curie}>{lockMessages[curie]}</div>
            ))}
          </div>
        )}
      </Modal.Body>
      {/* Only show the Cancel Merge button if there are still locked papers */}
      {lockedCuries.length > 0 && (
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => {
              if (countdownIntervalRef.current) {
                clearInterval(countdownIntervalRef.current);
                countdownIntervalRef.current = null;
              }
              if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
              }
              dispatch(mergeResetReferences());
              setShowLockModal(false);
              setCanMerge(false);
              setLockedCuries([]);
              setLockMessages({});
              setTimeoutOccurred(false);
            }}
          >
            Cancel Merge
          </Button>
        </Modal.Footer>
      )}
    </Modal>
     
    {(() => {
      if (queryDoubleSuccess) { return (
        <>
          <MergePairsSection referenceMeta1={referenceMeta1} referenceMeta2={referenceMeta2} referenceSwap={referenceSwap} hasPmid={hasPmid} pmidKeepReference={pmidKeepReference} />
          <AlertDismissibleMergeUpdate />
          <MergeSubmitDataTransferUpdateButton />
        </>
      ) }
    })()}

    { ( ( dataTransferHappened && mergeTransferringCount === 0 ) || ( mergeCompletingCount > 0 ) ) ?
      <MergeDataTransferredModal /> : null
    }

    { completionMergeHappened && mergeCompletingCount === 0 ?
      <MergeCompletedMergeModal /> : null
    }

    </>
  );
}

const MergeCompletedMergeModal = () => {
  const dispatch = useDispatch();
  const referenceMeta1 = useSelector(state => state.merge.referenceMeta1);
  const referenceMeta2 = useSelector(state => state.merge.referenceMeta2);
  const completionMergeHappened = useSelector(state => state.merge.completionMergeHappened);
  const updateFailure = useSelector(state => state.merge.updateFailure);
  const updateMessages = useSelector(state => state.merge.updateMessages);
  const url1 = '/Biblio/?action=display&referenceCurie=' + referenceMeta1.curie;
  const url2 = '/Biblio/?action=display&referenceCurie=' + referenceMeta2.curie;
  const url1e = '/Biblio/?action=entity&referenceCurie=' + referenceMeta1.curie;

  const modalBody = updateFailure ? 
                    <Modal.Body><a href={url2} target="_blank" rel="noreferrer noopener">{referenceMeta2.curie}</a> has failed to merge into
<a href={url1} target="_blank" rel="noreferrer noopener">{referenceMeta1.curie}</a>.<br/>
                      Contact a developer with the error message:<br/><br/>
                      Merge Completion Failure<br/>
                      {updateMessages.map((message, index) => (
                        <div key={`${message} ${index}`}>{message}</div>
                      ))}</Modal.Body> :
                    <Modal.Body>{referenceMeta2.curie} has been merged into <a href={url1} target="_blank" rel="noreferrer noopener">{referenceMeta1.curie}</a>.<br/>Information associated with {referenceMeta2.curie} has been removed.
                      { ( (referenceMeta1['referenceJson']['topic_entity_tags'].length > 0) || (referenceMeta2['referenceJson']['topic_entity_tags'].length > 0) ) && (<div><br />See <a href={url1e} target="_blank" rel="noreferrer noopener">topic entity tag</a> data.<br/></div>) }
                      </Modal.Body>
  const modalHeader = updateFailure ? 
                      <Modal.Header closeButton><Modal.Title>Error</Modal.Title></Modal.Header> :
                      <Modal.Header closeButton><Modal.Title>Merge Complete</Modal.Title></Modal.Header>

  // if wanting to simply hide modal and show form in previous state.  currently resetting form to original values.
  // <Modal size="lg" show={completionMergeHappened} onHide={() => dispatch(setCompletionMergeHappened(false))} >

  return (<Modal size="lg" show={completionMergeHappened} backdrop="static" onHide={() => dispatch(mergeResetReferences())} >
           {modalHeader}
           {modalBody}
          </Modal>);
}

const MergeDataTransferredModal = () => {
  const dispatch = useDispatch();
  const referenceMeta1 = useSelector(state => state.merge.referenceMeta1);
  const referenceMeta2 = useSelector(state => state.merge.referenceMeta2);
  const showDataTransferModal = useSelector(state => state.merge.showDataTransferModal);
  const updateFailure = useSelector(state => state.merge.updateFailure);
  const url1 = '/Biblio/?action=display&referenceCurie=' + referenceMeta1.curie;
  const url2 = '/Biblio/?action=display&referenceCurie=' + referenceMeta2.curie;

  const modalBody = updateFailure ? 
                    <Modal.Body>Data has been merged from {referenceMeta2.curie} into {referenceMeta1.curie} but something went wrong, <a href="/merge" target="_blank" rel="noreferrer noopener">try again in a new browser tab</a>.</Modal.Body> :
                    <Modal.Body>Selected data has been transferred from {referenceMeta2.curie} into {referenceMeta1.curie}.<br/><br/>
                    If you wish, you may verify the winning reference information <a href={url1} target="_blank" rel="noreferrer noopener">{referenceMeta1.curie}</a> and losing information to be removed from <a href={url2} target="_blank" rel="noreferrer noopener">{referenceMeta2.curie}</a>.<br/><br/>
                    Note that merged relations will only be viewable on merge completion.<br/><br/>
                    To finish, click Complete Merge below.<br/><br/>
                    <MergeSubmitCompleteMergeUpdateButton /></Modal.Body>
  const modalHeader = updateFailure ? 
                      <Modal.Header closeButton><Modal.Title>Error</Modal.Title></Modal.Header> :
                      <Modal.Header ><Modal.Title>Transfer Success</Modal.Title></Modal.Header>

  return (<Modal size="lg" show={showDataTransferModal} backdrop="static" onHide={() => dispatch(setShowDataTransferModal(false))} >
           {modalHeader}
           {modalBody}
          </Modal>);
} // const MergeDataTransferredModal

const MergeSubmitCompleteMergeUpdateButton = () => {
  const dispatch = useDispatch();
  const accessToken = useSelector(state => state.isLogged.accessToken);
  const referenceMeta1 = useSelector(state => state.merge.referenceMeta1);
  const referenceMeta2 = useSelector(state => state.merge.referenceMeta2);
  const mergeCompletingCount = useSelector(state => state.merge.mergeCompletingCount);
//   const completionMergeHappened = useSelector(state => state.merge.completionMergeHappened);

  function completeMergeReferences() {
    // old API and merged_into in reference table
    // let updateJsonReferenceMain = { 'merged_into_reference_curie': referenceMeta1.curie };
    // let subPath = 'reference/' + referenceMeta2.curie;
    // let array = [ subPath, updateJsonReferenceMain, 'PATCH', 0, null, null];
    let subPath = 'reference/merge/' + referenceMeta2.curie + '/' + referenceMeta1.curie;
    let array = [ subPath, null, 'POST', 0, null, null];
    array.unshift('mergeComplete');
    array.unshift(accessToken);
    console.log('completing merge');
    console.log(array);
    dispatch(setDataTransferHappened(false));
    dispatch(setMergeCompleting(1));
    dispatch(mergeButtonApiDispatch(array));
  }

  return (<>
           <Button variant='primary' onClick={() => completeMergeReferences()} >
             {mergeCompletingCount > 0 ? <Spinner animation="border" size="sm"/> : "Complete Merge"}</Button>
          </>
         );
//            <RowDivider />
//              {(completionMergeHappened > 0 && mergeCompletingCount === 0) && <>{referenceMeta2.curie} has been merged into {referenceMeta1.curie}.<br/>Information associated with {referenceMeta2.curie} has been removed.</>}
} // const MergeSubmitCompleteMergeUpdateButton


const AlertDismissibleMergeUpdate = () => {
  const dispatch = useDispatch();
  const updateAlert = useSelector(state => state.merge.updateAlert);
  const updateFailure = useSelector(state => state.merge.updateFailure);
  const updateMessages = useSelector(state => state.merge.updateMessages);
  let variant = 'danger';
  let header = 'Update Failure';
  if (updateFailure === 0) {
    header = 'Update Success';
    variant = 'success'; }
  else {
    header = 'Update Failure';
    variant = 'danger'; }
  if (updateAlert) {
    if (updateFailure === 0) {
      setTimeout(() => {
        dispatch(closeMergeUpdateAlert())
      }, 2000) }
    return (
      <Alert variant={variant} onClose={() => dispatch(closeMergeUpdateAlert())} dismissible>
        <Alert.Heading>{header}</Alert.Heading>
        {updateMessages.map((message, index) => (
          <div key={`${message} ${index}`}>{message}</div>
        ))}
      </Alert>
    );
  } else { return null; }
}

function deriveReffilesMd5sum(refMetaReffiles1, refMetaReffiles2) {
  const md5sums = {}; const reffile1 = {}; const reffile2 = {};
  if (refMetaReffiles1 !== null ) {
    for (const [index, val1] of refMetaReffiles1.entries()) {
      if ('md5sum' in val1 && val1['md5sum'] !== null && val1['md5sum'] !== '') {
        let reffile1md5sum = val1['md5sum'];
        if (reffile1md5sum in md5sums) { md5sums[reffile1md5sum] += 1; }
          else { md5sums[reffile1md5sum] = 1; }
        reffile1[reffile1md5sum] = JSON.parse(JSON.stringify(val1));
        reffile1[reffile1md5sum]['index'] = index;
        const toggle1 = ('toggle' in val1 && val1['toggle'] !== null && val1['toggle'] !== '') ? val1['toggle'] : null;
        reffile1[reffile1md5sum]['toggle'] = toggle1;
  } } }
  if (refMetaReffiles2 !== null ) {
    for (const [index, val2] of refMetaReffiles2.entries()) {
      if ('md5sum' in val2 && val2['md5sum'] !== null && val2['md5sum'] !== '') {
        let reffile2md5sum = val2['md5sum'];
        if (reffile2md5sum in md5sums) { md5sums[reffile2md5sum] += 1; }
          else { md5sums[reffile2md5sum] = 1; }
        reffile2[reffile2md5sum] = JSON.parse(JSON.stringify(val2));
        reffile2[reffile2md5sum]['index'] = index;
        const toggle2 = ('toggle' in val2 && val2['toggle'] !== null && val2['toggle'] !== '') ? val2['toggle'] : null;
        reffile2[reffile2md5sum]['toggle'] = toggle2;
  } } }
  // console.log('reffile1'); console.log('reffile2'); console.log('md5sums');
  // console.log(reffile1); console.log(reffile2); console.log(md5sums);
  return [reffile1, reffile2, md5sums];
} // function useDeriveReffilesMd5sum()

function deriveRefeferenceRelationsAgrkbs(refMetaReferenceRelations1, refMetaReferenceRelations2) {
  // this assumes that an agrkb cannot have two relationships to a unique other agrkb, so treating from and to the same.
  // if later they can have multiple connections, the from/to should be accounted for so agrkbs1/2 don't overwrite values.
  const agrkbs1 = {}; const agrkbs2 = {}; const sameAgrkbs = {}; const uniqAgrkbs1 = []; const uniqAgrkbs2 = [];
  for (let i = 0; i < refMetaReferenceRelations1['to_references'].length; i++) {
    const agrkb = refMetaReferenceRelations1['to_references'][i]['reference_curie_to'];
    if (!(agrkb in agrkbs1)) { agrkbs1[agrkb] = {}; }
    agrkbs1[agrkb]['index'] = i
    agrkbs1[agrkb]['direction'] = 'to';
    agrkbs1[agrkb]['toggle'] = refMetaReferenceRelations1['to_references'][i]['toggle'] || false;
    agrkbs1[agrkb]['id'] = refMetaReferenceRelations1['to_references'][i]['reference_relation_id'];
    agrkbs1[agrkb]['type'] = refMetaReferenceRelations1['to_references'][i]['reference_relation_type'];
    agrkbs1[agrkb]['subtype'] = 'to_references';
  }
  for (let i = 0; i < refMetaReferenceRelations1['from_references'].length; i++) {
    const agrkb = refMetaReferenceRelations1['from_references'][i]['reference_curie_from'];
    if (!(agrkb in agrkbs1)) { agrkbs1[agrkb] = {}; }
    agrkbs1[agrkb]['index'] = i
    agrkbs1[agrkb]['direction'] = 'from';
    agrkbs1[agrkb]['toggle'] = refMetaReferenceRelations1['from_references'][i]['toggle'] || false;
    agrkbs1[agrkb]['id'] = refMetaReferenceRelations1['from_references'][i]['reference_relation_id'];
    agrkbs1[agrkb]['type'] = refMetaReferenceRelations1['from_references'][i]['reference_relation_type'];
    agrkbs1[agrkb]['subtype'] = 'from_references';
  }
  for (let i = 0; i < refMetaReferenceRelations2['to_references'].length; i++) {
    const agrkb = refMetaReferenceRelations2['to_references'][i]['reference_curie_to'];
    if (!(agrkb in agrkbs2)) { agrkbs2[agrkb] = {}; }
    agrkbs2[agrkb]['index'] = i
    agrkbs2[agrkb]['direction'] = 'to';
    agrkbs2[agrkb]['toggle'] = refMetaReferenceRelations2['to_references'][i]['toggle'] || false;
    agrkbs2[agrkb]['id'] = refMetaReferenceRelations2['to_references'][i]['reference_relation_id'];
    agrkbs2[agrkb]['type'] = refMetaReferenceRelations2['to_references'][i]['reference_relation_type'];
    agrkbs2[agrkb]['subtype'] = 'to_references';
  }
  for (let i = 0; i < refMetaReferenceRelations2['from_references'].length; i++) {
    const agrkb = refMetaReferenceRelations2['from_references'][i]['reference_curie_from'];
    if (!(agrkb in agrkbs2)) { agrkbs2[agrkb] = {}; }
    agrkbs2[agrkb]['index'] = i
    agrkbs2[agrkb]['direction'] = 'from';
    agrkbs2[agrkb]['toggle'] = refMetaReferenceRelations2['from_references'][i]['toggle'] || false;
    agrkbs2[agrkb]['id'] = refMetaReferenceRelations2['from_references'][i]['reference_relation_id'];
    agrkbs2[agrkb]['type'] = refMetaReferenceRelations2['from_references'][i]['reference_relation_type'];
    agrkbs2[agrkb]['subtype'] = 'from_references';
  }

  Object.keys(agrkbs1).forEach((agrkb) => {
    if (agrkb in agrkbs2) { sameAgrkbs[agrkb] = 1; }
      else { uniqAgrkbs1.push(agrkb); } } );
  Object.keys(agrkbs2).forEach((agrkb) => {
    if (!(agrkb in agrkbs1)) {
      uniqAgrkbs2.push(agrkb); } } );
  return [agrkbs1, agrkbs2, sameAgrkbs, uniqAgrkbs1, uniqAgrkbs2];
} // function deriveRefeferenceRelationsAgrkbs(refMetaReferenceRelations1, refMetaReferenceRelations2)

const MergeSubmitDataTransferUpdateButton = () => {
  const dispatch = useDispatch();
  const accessToken = useSelector(state => state.isLogged.accessToken);
  const dataTransferHappened = useSelector(state => state.merge.dataTransferHappened);
  const mergeTransferringCount = useSelector(state => state.merge.mergeTransferringCount);
  const pmidKeepReference = useSelector(state => state.merge.pmidKeepReference);
  const referenceMeta1 = useSelector(state => state.merge.referenceMeta1);
  const referenceMeta2 = useSelector(state => state.merge.referenceMeta2);
  const referenceSwap = useSelector(state => state.merge.referenceSwap);
//   const queryDoubleSuccess = useSelector(state => state.merge.queryDoubleSuccess);
  const hasPmid = useSelector(state => state.merge.hasPmid);
  const ateamResults = useSelector(state => state.merge.ateamResults);
  const atpParents = useSelector(state => state.merge.atpParents);
  const atpOntology = useSelector(state => state.merge.atpOntology);

  function mergeReferences() {
    const forApiArray = [];
    let updateJsonReferenceMain = {};

    const remapFieldNamesApi = { 'resource_curie': 'resource' };

    const fieldsSimpleNotPatch = ['reference_id', 'curie', 'resource_title', 'citation'];
    for (const fieldName of fieldsSimple.values()) {
      if (fieldsSimpleNotPatch.includes(fieldName)) { continue; }
      if ( (referenceMeta1['referenceJson'][fieldName] === null ) &&
           (referenceMeta2['referenceJson'][fieldName] === null ) ) { continue; }

      let keep1 = true;
      if ( ( fieldsPubmedUnlocked.includes(fieldName) || fieldsPubmedLocked.includes(fieldName) || fieldsPubmedOnly.includes(fieldName) ) &&
           (pmidKeepReference === 2 && hasPmid) ) { keep1 = !keep1; }
      if ( (fieldName in referenceSwap) && (referenceSwap[fieldName] === true) ) { keep1 = !keep1; }

      if (!keep1) {
        console.log(keep1 + ' simple field ' + fieldName + ' one ' + referenceMeta1['referenceJson'][fieldName] + ' two ' + referenceMeta2['referenceJson'][fieldName]);
        const fieldNameJson = ( fieldName in remapFieldNamesApi ) ? remapFieldNamesApi[fieldName] : fieldName;
        updateJsonReferenceMain[fieldNameJson] = referenceMeta2['referenceJson'][fieldName];
      }
    }

    for (const fieldName of fieldsPubmedArrayString.values()) {
      if ( (referenceMeta1['referenceJson'][fieldName] === null ) &&
           (referenceMeta2['referenceJson'][fieldName] === null ) ) { continue; }
      let keep1 = true;
      if ( pmidKeepReference === 2 && hasPmid ) { keep1 = !keep1; }
      if (!keep1) {
        const fieldNameJson = ( fieldName in remapFieldNamesApi ) ? remapFieldNamesApi[fieldName] : fieldName;
        updateJsonReferenceMain[fieldNameJson] = referenceMeta2['referenceJson'][fieldName] } }

    if ( ( referenceMeta1['referenceJson']['prepublication_pipeline'] !== referenceMeta2['referenceJson']['prepublication_pipeline'] ) &&
         ( referenceMeta2['referenceJson']['prepublication_pipeline'] === true ) ) {
        updateJsonReferenceMain['prepublication_pipeline'] = 'true'; }

    console.log(updateJsonReferenceMain);
    if (Object.keys(updateJsonReferenceMain).length !== 0) {
      const referenceCurie = referenceMeta1.curie;
      let subPath = 'reference/' + referenceCurie;
      let array = [ subPath, updateJsonReferenceMain, 'PATCH', 0, null, null]
      forApiArray.push( array );
    }

    if ('mod_reference_types' in referenceMeta1['referenceJson'] && referenceMeta1['referenceJson']['mod_reference_types'] !== null) {
      for (const modRefDict of referenceMeta1['referenceJson']['mod_reference_types'].values()) {
        if (modRefDict['toggle']) {
          let subPath = 'reference/mod_reference_type/' + modRefDict['mod_reference_type_id'];
          let array = [ subPath, null, 'DELETE', 0, null, null]
          forApiArray.push( array );
    } } }
    if ('mod_reference_types' in referenceMeta2['referenceJson'] && referenceMeta2['referenceJson']['mod_reference_types'] !== null) {
      for (const modRefDict of referenceMeta2['referenceJson']['mod_reference_types'].values()) {
        if (modRefDict['toggle']) {
          const referenceCurie = referenceMeta1.curie;
          const updateJsonMrt2 = { 'reference_curie': referenceCurie }
          let subPath = 'reference/mod_reference_type/' + modRefDict['mod_reference_type_id'];
          let array = [ subPath, updateJsonMrt2, 'PATCH', 0, null, null]
          forApiArray.push( array );
    } } }

    if ('mod_corpus_associations' in referenceMeta1['referenceJson'] && referenceMeta1['referenceJson']['mod_corpus_associations'] !== null) {
      for (const mcaDict of referenceMeta1['referenceJson']['mod_corpus_associations'].values()) {
        if (mcaDict['toggle']) {
          let subPath = 'reference/mod_corpus_association/' + mcaDict['mod_corpus_association_id'];
          let array = [ subPath, null, 'DELETE', 0, null, null]
          forApiArray.push( array );
    } } }
    if ('mod_corpus_associations' in referenceMeta2['referenceJson'] && referenceMeta2['referenceJson']['mod_corpus_associations'] !== null) {
      for (const mcaDict of referenceMeta2['referenceJson']['mod_corpus_associations'].values()) {
        if (mcaDict['toggle']) {
          const referenceCurie = referenceMeta1.curie;
          const updateJsonMrt2 = { 'reference_curie': referenceCurie }
          let subPath = 'reference/mod_corpus_association/' + mcaDict['mod_corpus_association_id'];
          let array = [ subPath, updateJsonMrt2, 'PATCH', 0, null, null]
          forApiArray.push( array );
    } } }

    if ('cross_references' in referenceMeta1['referenceJson'] && referenceMeta1['referenceJson']['cross_references'] !== null) {
      for (const xrefDict of referenceMeta1['referenceJson']['cross_references'].values()) {
        const subPath = 'cross_reference/' + xrefDict['cross_reference_id'];
        if ('is_obsolete' in xrefDict && xrefDict['is_obsolete'] !== null) {
          if (xrefDict['is_obsolete'] === false && xrefDict['toggle']) {		// was valid, now toggle, set obsolete
            const updateJsonXref1Obsolete = { 'is_obsolete': true }
            let array = [ subPath, updateJsonXref1Obsolete, 'PATCH', 0, null, null];
            forApiArray.push( array );
    } } } }
    if ('cross_references' in referenceMeta2['referenceJson'] && referenceMeta2['referenceJson']['cross_references'] !== null) {
      for (const xrefDict of referenceMeta2['referenceJson']['cross_references'].values()) {
        if ('is_obsolete' in xrefDict && xrefDict['is_obsolete'] !== null) {
          const subPath = 'cross_reference/' + xrefDict['cross_reference_id'];
          const referenceCurie = referenceMeta1.curie;
          const updateJsonXref2 = { 'reference_curie': referenceCurie }
          if (xrefDict['is_obsolete'] === false) {		// was valid
            if (xrefDict['toggle']) { }				// yes toggle, keep to ref1
            else {						// no toggle, set obsolete to ref1
              updateJsonXref2['is_obsolete'] = true; } }
          else if (xrefDict['is_obsolete'] === true) { }	// was obsolete, set to ref1
          let array = [ subPath, updateJsonXref2, 'PATCH', 0, null, null];
          forApiArray.push( array );
    } } }

    if ('mesh_terms' in referenceMeta1['referenceJson'] && referenceMeta1['referenceJson']['mesh_terms'] !== null) {
      for (const meshDict of referenceMeta1['referenceJson']['mesh_terms']) {
        if (pmidKeepReference === 2 && hasPmid) { 
          let subPath = 'reference/mesh_detail/' + meshDict['mesh_detail_id'];
          let array = [ subPath, null, 'DELETE', 0, null, null]
          forApiArray.push( array );
    } } }
    if ('mesh_terms' in referenceMeta2['referenceJson'] && referenceMeta2['referenceJson']['mesh_terms'] !== null) {
      for (const meshDict of referenceMeta2['referenceJson']['mesh_terms'].values()) {
        if (pmidKeepReference === 2 && hasPmid) { 
          const referenceCurie = referenceMeta1.curie;
          const updateJsonMrt2 = { 'reference_curie': referenceCurie }
          let subPath = 'reference/mesh_detail/' + meshDict['mesh_detail_id'];
          let array = [ subPath, updateJsonMrt2, 'PATCH', 0, null, null]
          forApiArray.push( array );
    } } }

    let authorOrder = 0;
    if ('authors' in referenceMeta1['referenceJson'] && referenceMeta1['referenceJson']['authors'] !== null) {
      const orderedAuthors = [];
      for (const value of referenceMeta1['referenceJson']['authors'].values()) {
        let index = value['order'] - 1;
        if (index < 0) { index = 0 }      // temporary fix for fake authors have an 'order' field value of 0
        orderedAuthors[index] = value; }
      for (const [index, authDict] of orderedAuthors.entries()) {
        // console.log( authDict['first_name'] + ' ' + authDict['author_id'] + ' index ' + index + ' order ' + authDict['order']);
        let swap = false;
        if (authDict['toggle']) { swap = !swap; }
        if (pmidKeepReference === 2) { swap = !swap; }
        if (swap) {
          // console.log('remove ' + authDict['author_id'] + ' ' + authDict['order']);
          let subPath = 'author/' + authDict['author_id'];
          let array = [ subPath, null, 'DELETE', 0, null, null];
          forApiArray.push( array ); } 
        else { 
          authorOrder++;
          // console.log('no swap raise authorOrder to ' + authorOrder);
          if (authorOrder-1 !== index) {
            // console.log('reorder ' + authDict['author_id'] + ' to authorOrder ' + authorOrder);
            const updateJsonAuth1 = { 'order': authorOrder }
            let subPath = 'author/' + authDict['author_id'];
            let array = [ subPath, updateJsonAuth1, 'PATCH', 0, null, null];
            forApiArray.push( array );
    } } } }
    if ('authors' in referenceMeta2['referenceJson'] && referenceMeta2['referenceJson']['authors'] !== null) {
      const orderedAuthors = [];
      for (const value of referenceMeta2['referenceJson']['authors'].values()) {
        let index = value['order'] - 1;
        if (index < 0) { index = 0 }      // temporary fix for fake authors have an 'order' field value of 0
        orderedAuthors[index] = value; }
      for (const authDict of orderedAuthors.values()) {
      // for (const [index, authDict] of orderedAuthors.entries())
        // console.log( authDict['first_name'] + ' ' + authDict['author_id'] + ' index ' + index + ' order ' + authDict['order']);
        let swap = false;
        if (authDict['toggle']) { swap = !swap; }
        if (pmidKeepReference === 2) { swap = !swap; }
        if (swap) {
          authorOrder++;
          // console.log('transfer ' + authDict['author_id'] + ' ' + authDict['order'] + ' to ' + authorOrder);
          const referenceCurie = referenceMeta1.curie;
          const updateJsonAuth2 = { 'reference_curie': referenceCurie, 'order': authorOrder }
          let subPath = 'author/' + authDict['author_id'];
          let array = [ subPath, updateJsonAuth2, 'PATCH', 0, null, null];
          forApiArray.push( array ); } 
        else { 
          // console.log('no swap remove ' + authorOrder);
          let subPath = 'author/' + authDict['author_id'];
          let array = [ subPath, null, 'DELETE', 0, null, null];
          forApiArray.push( array );
    } } }

    const [reffile1, reffile2, md5sums] = deriveReffilesMd5sum(referenceMeta1['referenceJson']['reference_files'], referenceMeta2['referenceJson']['reference_files'])
    const sameMd5 = {}; const uniqMd5 = {};
    const sortedKeys = Object.keys(md5sums).sort();
    for (let i = 0; i < sortedKeys.length; i++) {
      const md5sum = sortedKeys[i];
      if (md5sums[md5sum] > 1) { sameMd5[md5sum] = true; }
        else {
          uniqMd5[md5sum] = true; } }

    if ('reference_files' in referenceMeta2['referenceJson'] && referenceMeta2['referenceJson']['reference_files'] !== null) {
      for (const reffileDict of referenceMeta2['referenceJson']['reference_files'].values()) {
        if (reffileDict['md5sum'] in uniqMd5) {
          console.log('transfer ' + reffileDict['md5sum'] + ' to winning ref');
          const updateJsonReffile2 = { 'reference_curie': referenceMeta1['referenceJson']['curie'] }
          let subPath = 'reference/referencefile/' + reffile2[reffileDict['md5sum']]['referencefile_id'];
          let array = [ subPath, updateJsonReffile2, 'PATCH', 0, null, null];
          forApiArray.push( array );
        }
        else if (reffileDict['md5sum'] in sameMd5) {
          let swap = false;
          if (reffileDict['toggle']) { swap = !swap; }
          if (pmidKeepReference === 2) { swap = !swap; }
          const winning_reffile_id = (swap) ? reffile2[reffileDict['md5sum']]['referencefile_id'] : reffile1[reffileDict['md5sum']]['referencefile_id']
          const losing_reffile_id = (swap) ? reffile1[reffileDict['md5sum']]['referencefile_id'] : reffile2[reffileDict['md5sum']]['referencefile_id']
          console.log('transfer losing ' + losing_reffile_id + ' to winning ' + winning_reffile_id);
          let subPath = 'reference/referencefile/merge/' + referenceMeta1['referenceJson']['curie'] + '/' + losing_reffile_id + '/' + winning_reffile_id;
          let array = [ subPath, null, 'POST', 0, null, null]
          forApiArray.push( array );
        }
    } }

    const [agrkbs1, agrkbs2, sameAgrkbs, uniqAgrkbs1, uniqAgrkbs2] = deriveRefeferenceRelationsAgrkbs(referenceMeta1['referenceJson']['reference_relations'], referenceMeta2['referenceJson']['reference_relations']);
    // same reference_relations if toggled, winning reference relation is deleted, losing reference relation is transfered to winning reference
    Object.keys(sameAgrkbs).forEach((agrkb) => {
      if (agrkb in agrkbs1 && agrkbs1[agrkb]['toggle'] !== false) {
        let subPath = 'reference_relation/' + agrkbs1[agrkb]['id'];
        let array = [ subPath, null, 'DELETE', 0, null, null]
        console.log('delete sameAgrkbs array'); console.log(array);
        forApiArray.push( array ); }
      if (agrkb in agrkbs2 && agrkbs2[agrkb]['toggle'] !== false) {
        const updateJsonRelation2 = { 'reference_relation_type': agrkbs2[agrkb]['type'] };
        if (agrkbs2[agrkb]['direction'] === 'from') {
            updateJsonRelation2['reference_curie_from'] = agrkb;
            updateJsonRelation2['reference_curie_to'] = referenceMeta1['referenceJson']['curie']; }
          else if (agrkbs2[agrkb]['direction'] === 'to') {
            updateJsonRelation2['reference_curie_to'] = agrkb;
            updateJsonRelation2['reference_curie_from'] = referenceMeta1['referenceJson']['curie']; }
        let subPath = 'reference_relation/' + agrkbs2[agrkb]['id'];
        let array = [ subPath, updateJsonRelation2, 'PATCH', 0, null, null];
        console.log('patch sameAgrkbs array'); console.log(array);
        forApiArray.push( array ); }
    });
    for (let i = 0; i < uniqAgrkbs2.length; i++) {
      const agrkb = uniqAgrkbs2[i];
      if (agrkb === referenceMeta1['referenceJson']['curie']) {
      // if it's a relation to winning reference, delete it instead of transferring, or it will create a connection to itself, which is db constrained
        let subPath = 'reference_relation/' + agrkbs2[agrkb]['id'];
        let array = [ subPath, null, 'DELETE', 0, null, null]
        console.log('delete uniqAgrkbs2 array'); console.log(array);
        forApiArray.push( array ); }
      else {
      // unique reference_relations from losing reference are transfered to winning reference, which is redundant since API would do that upon merge, but this lets curators transfer data before merging the references, so they could check what got transferred before obsoleting the losing reference
        const updateJsonRelation2 = { 'reference_relation_type': agrkbs2[agrkb]['type'] };
        if (agrkbs2[agrkb]['direction'] === 'from') {
            updateJsonRelation2['reference_curie_from'] = agrkb;
            updateJsonRelation2['reference_curie_to'] = referenceMeta1['referenceJson']['curie']; }
          else if (agrkbs2[agrkb]['direction'] === 'to') {
            updateJsonRelation2['reference_curie_to'] = agrkb;
            updateJsonRelation2['reference_curie_from'] = referenceMeta1['referenceJson']['curie']; }
        let subPath = 'reference_relation/' + agrkbs2[agrkb]['id'];
        let array = [ subPath, updateJsonRelation2, 'PATCH', 0, null, null]
        console.log('patch uniqAgrkbs2array'); console.log(array);
        forApiArray.push( array ); } }

    const sortedWorkflow = deriveWorkflowData(referenceMeta1, referenceMeta2, atpOntology);
    // fileupload gets transferred based on priority
    Object.keys(sortedWorkflow['fileuploadMods']).sort().forEach((mod) => {
      let priority1 = 0; let priority2 = 0; let winner_id = null; let loser_id = null;
      if (mod in sortedWorkflow['fileupload1']) {
        winner_id = sortedWorkflow['fileupload1'][mod]['id'];
        priority1 = atpOntology['ATP:0000140'][sortedWorkflow['fileupload1'][mod]['atp']]['priority']; }
      if (mod in sortedWorkflow['fileupload2']) {
        loser_id = sortedWorkflow['fileupload2'][mod]['id'];
        priority2 = atpOntology['ATP:0000140'][sortedWorkflow['fileupload2'][mod]['atp']]['priority']; }
      if (priority2 > priority1) { [winner_id, loser_id] = [loser_id, winner_id]; }
      let subPath = 'workflow_tag/' + loser_id;
      let array = [ subPath, null, 'DELETE', 0, null, null]
      if (loser_id !== null) {
        console.log('array'); console.log(array);
        forApiArray.push( array ); }
      if (priority2 > priority1) {
        subPath = 'workflow_tag/' + winner_id;
        array = [ subPath, { 'reference_curie': referenceMeta1['referenceJson']['curie'] }, 'PATCH', 0, null, null]
        console.log('array'); console.log(array);
        forApiArray.push( array ); }
    });
    // curatability gets transferred based on toggle
    Object.keys(sortedWorkflow['curatabilityMods']).sort().forEach((mod) => {
      if (mod in sortedWorkflow['curatability1']) {
        if (sortedWorkflow['curatability1'][mod]['toggle'] !== false) {
          let subPath = 'workflow_tag/' + sortedWorkflow['curatability1'][mod]['id'];
          let array = [ subPath, null, 'DELETE', 0, null, null]
          console.log('array'); console.log(array);
          forApiArray.push( array ); } }
      if (mod in sortedWorkflow['curatability2']) {
        if (sortedWorkflow['curatability2'][mod]['toggle'] !== false) {
          let subPath = 'workflow_tag/' + sortedWorkflow['curatability2'][mod]['id'];
          let array = [ subPath, { 'reference_curie': referenceMeta1['referenceJson']['curie'] }, 'PATCH', 0, null, null]
          console.log('array'); console.log(array);
          forApiArray.push( array ); } }
    });
    // unaccounted for cannot get transferred

    let dispatchCount = forApiArray.length;

    // console.log('dispatchCount ' + dispatchCount)
    dispatch(setMergeUpdating(dispatchCount))

    console.log(forApiArray);
    for (const arrayData of forApiArray.values()) {
      arrayData.unshift('mergeData');
      arrayData.unshift(accessToken)
      dispatch(mergeButtonApiDispatch(arrayData))
    }

  } // function mergeReferences()

  let transferButtonDisabled = '';
  if (atpParents.length > ateamResults) { transferButtonDisabled = 'disabled'; }
  if ( (referenceMeta1['referenceJson']['topic_entity_tags'].length > 0) && (referenceMeta1['tetCheckbox'] === false) ) { transferButtonDisabled = 'disabled'; }
  if ( (referenceMeta2['referenceJson']['topic_entity_tags'].length > 0) && (referenceMeta2['tetCheckbox'] === false) ) { transferButtonDisabled = 'disabled'; }
  if (dataTransferHappened) { return null; }
  else {
    return (<>
             <Button variant='primary' disabled={transferButtonDisabled} onClick={() => mergeReferences()} >
               {mergeTransferringCount > 0 ? <Spinner animation="border" size="sm"/> : "Transfer Data"}</Button>
             <RowDivider />
            </>
           ); }
} // const MergeSubmitDataTransferUpdateButton

// <RowDisplayString key={fieldName} fieldName={fieldName} referenceJsonLive={referenceJsonLive} referenceJsonDb={referenceJsonDb} />

//       <RowDisplayPairSimple key="title" fieldName="title" referenceMeta1={referenceMeta1} referenceMeta2={referenceMeta2} referenceSwap={referenceSwap} />
//       <RowDisplayPairSimple key="category" fieldName="category" referenceMeta1={referenceMeta1} referenceMeta2={referenceMeta2} referenceSwap={referenceSwap} />

//       <Row>
//         <Col sm="2" >Title</Col>
//         <Col sm="5" >{referenceMeta1.referenceJson.title}</Col>
//         <Col sm="5" >{referenceMeta2.referenceJson.title}</Col>
//       </Row>
//       <Row>
//         <Col sm="2" >Category</Col>
//         <Col sm="5" >{referenceMeta1.referenceJson.category}</Col>
//         <Col sm="5" >{referenceMeta2.referenceJson.category}</Col>
//       </Row>

const MergePairsSection = ({referenceMeta1, referenceMeta2, referenceSwap, hasPmid, pmidKeepReference}) => {
  const rowOrderedElements = []
  for (const [fieldIndex, fieldName] of fieldsOrdered.entries()) {
    if (fieldName === 'DIVIDER') {
      rowOrderedElements.push(<RowDivider key={fieldIndex} />); }
    else if (fieldsSimple.includes(fieldName)) {
      rowOrderedElements.push(
        <RowDisplayPairSimple key={fieldName} fieldName={fieldName} referenceMeta1={referenceMeta1} referenceMeta2={referenceMeta2} referenceSwap={referenceSwap} hasPmid={hasPmid} pmidKeepReference={pmidKeepReference} /> ); }
    else if (fieldsPubmedArrayString.includes(fieldName)) {
      rowOrderedElements.push(
        <RowDisplayPairPubmedArrayString key={fieldName} fieldName={fieldName} referenceMeta1={referenceMeta1} referenceMeta2={referenceMeta2} referenceSwap={referenceSwap} hasPmid={hasPmid} pmidKeepReference={pmidKeepReference} /> ); }
    else if (fieldName === 'authors') {
      rowOrderedElements.push(
        <RowDisplayPairAuthors key="RowDisplayPairAuthors" fieldName={fieldName} referenceMeta1={referenceMeta1} referenceMeta2={referenceMeta2} referenceSwap={referenceSwap} hasPmid={hasPmid} pmidKeepReference={pmidKeepReference} /> ); }
    else if (fieldName === 'mod_reference_types') {
      rowOrderedElements.push(
        <RowDisplayPairModReferenceTypes key="RowDisplayPairModReferenceTypes" fieldName={fieldName} referenceMeta1={referenceMeta1} referenceMeta2={referenceMeta2} referenceSwap={referenceSwap} hasPmid={hasPmid} /> ); }
    else if (fieldName === 'prepublication_pipeline') {
      rowOrderedElements.push(
        <RowDisplayPairPrepublicationPipeline key="RowDisplayPairPrepublicationPipeline" fieldName={fieldName} referenceMeta1={referenceMeta1} referenceMeta2={referenceMeta2} referenceSwap={referenceSwap} hasPmid={hasPmid} /> ); }
    else if (fieldName === 'mod_corpus_associations') {
      rowOrderedElements.push(
        <RowDisplayPairModCorpusAssociations key="RowDisplayPairModCorpusAssociations" fieldName={fieldName} referenceMeta1={referenceMeta1} referenceMeta2={referenceMeta2} referenceSwap={referenceSwap} hasPmid={hasPmid} /> ); }
    else if (fieldName === 'reference_relations') {
      rowOrderedElements.push(
        <RowDisplayPairReferenceRelations key="RowDisplayPairReferenceRelations" fieldName={fieldName} referenceMeta1={referenceMeta1} referenceMeta2={referenceMeta2} referenceSwap={referenceSwap} hasPmid={hasPmid} pmidKeepReference={pmidKeepReference} /> ); }
    else if (fieldName === 'cross_references') {
      rowOrderedElements.push(
        <RowDisplayPairCrossReferencesValid key="RowDisplayPairCrossReferencesValid" fieldName={fieldName} referenceMeta1={referenceMeta1} referenceMeta2={referenceMeta2} referenceSwap={referenceSwap} hasPmid={hasPmid} /> );
      rowOrderedElements.push(<RowDivider key={fieldIndex} />);
      rowOrderedElements.push(
        <RowDisplayPairCrossReferencesObsolete key="RowDisplayPairCrossReferencesObsolete" fieldName={fieldName} referenceMeta1={referenceMeta1} referenceMeta2={referenceMeta2} referenceSwap={referenceSwap} hasPmid={hasPmid} /> ); }
    else if (fieldName === 'mesh_terms') {
      rowOrderedElements.push(
        <RowDisplayPairPubmedMeshTerms key="RowDisplayPairPubmedMeshTerms" fieldName={fieldName} referenceMeta1={referenceMeta1} referenceMeta2={referenceMeta2} referenceSwap={referenceSwap} hasPmid={hasPmid} pmidKeepReference={pmidKeepReference} /> ); }
    else if (fieldName === 'reference_files') {
      rowOrderedElements.push(
        <RowDisplayPairReferenceFiles key="RowDisplayPairReferenceFiles" fieldName={fieldName} referenceMeta1={referenceMeta1} referenceMeta2={referenceMeta2} referenceSwap={referenceSwap} hasPmid={hasPmid} pmidKeepReference={pmidKeepReference} /> ); }
    else if (fieldName === 'workflow_tags') {
      rowOrderedElements.push(
        <RowDisplayPairWorkflowTags key="RowDisplayPairWorkflowTags" fieldName={fieldName} referenceMeta1={referenceMeta1} referenceMeta2={referenceMeta2} referenceSwap={referenceSwap} hasPmid={hasPmid} pmidKeepReference={pmidKeepReference} /> ); }
    else if (fieldName === 'topic_entity_tags') {
      rowOrderedElements.push(
        <RowDisplayPairTopicEntityTags key="RowDisplayPairTopicEntityTags" fieldName={fieldName} referenceMeta1={referenceMeta1} referenceMeta2={referenceMeta2} referenceSwap={referenceSwap} hasPmid={hasPmid} pmidKeepReference={pmidKeepReference} /> ); }
  }
  return (<Container fluid>{rowOrderedElements}</Container>);
} // const MergePairsSection

const RowDisplayPairSimple = ({fieldName, referenceMeta1, referenceMeta2, referenceSwap, hasPmid, pmidKeepReference}) => {
  const dispatch = useDispatch();
//   const hasPmid = true;
  if ( (referenceMeta1['referenceJson'][fieldName] === null ) &&
       (referenceMeta2['referenceJson'][fieldName] === null ) ) { return null; }
    // keep resource_title in fieldsOrdered in case it's useful later, but only display it when looking at resource_curie
  if (fieldName === 'resource_title') { return null; }
  let keepClass1 = 'div-merge-keep'; let keepClass2 = 'div-merge-obsolete'; let swapColor = false;
  // if (keepReference === 2) { swapColor = !swapColor; }
  if ( ( fieldsPubmedUnlocked.includes(fieldName) || fieldsPubmedLocked.includes(fieldName) || fieldsPubmedOnly.includes(fieldName) ) &&
       (pmidKeepReference === 2) && hasPmid) { swapColor = !swapColor; }
  if ( (fieldName in referenceSwap) && (referenceSwap[fieldName] === true) ) { swapColor = !swapColor; }
  if (swapColor) { keepClass2 = [keepClass1, keepClass1 = keepClass2][0]; }
  
  const isLocked = GenerateIsLocked(fieldName, hasPmid);
  const element0 = GenerateFieldLabel(fieldName, isLocked);
//   const element0 = (hasPmid) ?
//     <div className={`div-merge div-merge-grey`}> <FontAwesomeIcon icon={faLockOpen} /> {fieldName}</div> :
//     <div className={`div-merge div-merge-grey`}>{fieldName}</div>;

  let fieldValue1 = (referenceMeta1['referenceJson'][fieldName]);
  let fieldValue2 = (referenceMeta2['referenceJson'][fieldName]);
  if (fieldName === 'resource_curie') { 
    fieldValue1 = (<>{fieldValue1} <br/> {referenceMeta1['referenceJson']['resource_title']}</>); 
    fieldValue2 = (<>{fieldValue2} <br/> {referenceMeta2['referenceJson']['resource_title']}</>); }
  if ( (fieldName === 'title') || (fieldName === 'abstract') ) {
    fieldValue1 = (<span dangerouslySetInnerHTML={{__html: referenceMeta1['referenceJson'][fieldName]}} />);
    fieldValue2 = (<span dangerouslySetInnerHTML={{__html: referenceMeta2['referenceJson'][fieldName]}} />); }
  let element1 = (<div></div>); let element2 = (<div></div>);
  if (referenceMeta1['referenceJson'][fieldName] !== null && referenceMeta1['referenceJson'][fieldName] !== '') { 
    element1 = (!hasPmid || isLocked === 'unlock') ?
               (<div className={`div-merge ${keepClass1}`} onClick={() => dispatch(mergeSwapPairSimple(fieldName))} >{fieldValue1}</div>) :
               (<div className={`div-merge ${keepClass1}`} >{fieldValue1}</div>); } 
  if (referenceMeta2['referenceJson'][fieldName] !== null && referenceMeta2['referenceJson'][fieldName] !== '') { 
    element2 = (!hasPmid || isLocked === 'unlock') ?
               (<div className={`div-merge ${keepClass2}`} onClick={() => dispatch(mergeSwapPairSimple(fieldName))} >{fieldValue2}</div>) :
               (<div className={`div-merge ${keepClass2}`} >{fieldValue2}</div>); }
  return (
    <Row>
      <Col sm="2" >{element0}</Col>
      <Col sm="5" >{element1}</Col>
      <Col sm="5" >{element2}</Col>
    </Row>
  )
}
//       <Col sm="2" ><div className={`div-merge div-merge-grey`}>{fieldName}</div></Col>
//       <Col sm="2" className={`div-merge div-merge-grey`}>{fieldName}</Col>
//       <Col sm="5" className={`div-merge div-merge-keep`}>{referenceMeta1['referenceJson'][fieldName]}</Col>
//       <Col sm="5" className={`div-merge div-merge-obsolete`}>{referenceMeta2['referenceJson'][fieldName]}</Col>

const RowDisplayPairPubmedArrayString = ({fieldName, referenceMeta1, referenceMeta2, referenceSwap, hasPmid, pmidKeepReference}) => {
//   console.log(' e1 ' + referenceMeta1['referenceJson'][fieldName]);
//   console.log(' e2 ' + referenceMeta2['referenceJson'][fieldName]);
  if ( (referenceMeta1['referenceJson'][fieldName] === null || referenceMeta1['referenceJson'][fieldName].length === 0) &&
       (referenceMeta2['referenceJson'][fieldName] === null || referenceMeta2['referenceJson'][fieldName].length === 0) ) { return null; }
  let keepClass1 = 'div-merge-keep'; let keepClass2 = 'div-merge-obsolete'; let swapColor = false;
  if ( ( fieldsPubmedUnlocked.includes(fieldName) || fieldsPubmedLocked.includes(fieldName) || fieldsPubmedOnly.includes(fieldName) ) &&
       (pmidKeepReference === 2) ) { swapColor = !swapColor; }
  if (swapColor) { keepClass2 = [keepClass1, keepClass1 = keepClass2][0]; }
  const isLocked = GenerateIsLocked(fieldName, hasPmid);
  const element0 = GenerateFieldLabel(fieldName, isLocked);
  let element1 = (<div></div>); let element2 = (<div></div>);
  if (referenceMeta1['referenceJson'][fieldName] !== null && referenceMeta1['referenceJson'][fieldName] !== undefined) {
    const string1 = referenceMeta1['referenceJson'][fieldName].join(', ');
    element1 = (<div className={`div-merge ${keepClass1}`} >{string1}</div>); }
  if (referenceMeta2['referenceJson'][fieldName] !== null && referenceMeta2['referenceJson'][fieldName] !== undefined) {
    const string2 = referenceMeta2['referenceJson'][fieldName].join(', ');
    element2 = (<div className={`div-merge ${keepClass2}`} >{string2}</div>); }
  return (
      <Row key={`nontoggle ${fieldName}`}>
        <Col sm="2" >{element0}</Col>
        <Col sm="5" >{element1}</Col>
        <Col sm="5" >{element2}</Col>
      </Row>);
} // const RowDisplayPairPubmedArrayString 

const RowDisplayPairPubmedMeshTerms = ({fieldName, referenceMeta1, referenceMeta2, referenceSwap, hasPmid, pmidKeepReference}) => {
  if ( (referenceMeta1['referenceJson'][fieldName] === null || referenceMeta1['referenceJson'][fieldName].length === 0) &&
       (referenceMeta2['referenceJson'][fieldName] === null || referenceMeta2['referenceJson'][fieldName].length === 0) ) { return null; }
  let keepClass1 = 'div-merge-keep'; let keepClass2 = 'div-merge-obsolete'; let swapColor = false;
  if ( ( fieldsPubmedUnlocked.includes(fieldName) || fieldsPubmedLocked.includes(fieldName) || fieldsPubmedOnly.includes(fieldName) ) &&
       (pmidKeepReference === 2) ) { swapColor = !swapColor; }
  if (swapColor) { keepClass2 = [keepClass1, keepClass1 = keepClass2][0]; }
  const isLocked = GenerateIsLocked(fieldName, hasPmid);
  const element0 = GenerateFieldLabel(fieldName, isLocked);
  let element1 = (<div></div>); let element2 = (<div></div>);
  if (referenceMeta1['referenceJson'][fieldName] !== null && referenceMeta1['referenceJson'][fieldName] !== undefined) {
    const meshTextArray = []
    for (const value of referenceMeta1['referenceJson'][fieldName]) {
      let term = value['heading_term'];
      if (value['qualifier_term'] !== null) { term += ' ' + value['qualifier_term']; }
      meshTextArray.push(term); }
    const meshText = (<span dangerouslySetInnerHTML={{__html: meshTextArray.join('; ')}} />)
    element1 = (<div className={`div-merge ${keepClass1}`} >{meshText}</div>); }
  if (referenceMeta2['referenceJson'][fieldName] !== null && referenceMeta2['referenceJson'][fieldName] !== undefined) {
    const meshTextArray = []
    for (const value of referenceMeta2['referenceJson'][fieldName]) {
      let term = value['heading_term'];
      if (value['qualifier_term'] !== null) { term += ' ' + value['qualifier_term']; }
      meshTextArray.push(term); }
    const meshText = (<span dangerouslySetInnerHTML={{__html: meshTextArray.join('; ')}} />)
    element2 = (<div className={`div-merge ${keepClass2}`} >{meshText}</div>); }
  return (
      <Row key={`nontoggle ${fieldName}`}>
        <Col sm="2" >{element0}</Col>
        <Col sm="5" >{element1}</Col>
        <Col sm="5" >{element2}</Col>
      </Row>);
} // const RowDisplayPairPubmedMeshTerms 

const RowDisplayPairReferenceFiles = ({fieldName, referenceMeta1, referenceMeta2, referenceSwap, hasPmid, pmidKeepReference}) => {
  const dispatch = useDispatch();
  if ( (referenceMeta1['referenceJson'][fieldName] === null ) &&
       (referenceMeta2['referenceJson'][fieldName] === null ) ) { return null; }
  const [reffile1, reffile2, md5sums] = deriveReffilesMd5sum(referenceMeta1['referenceJson']['reference_files'], referenceMeta2['referenceJson']['reference_files'])
  const sameMd5 = {}; const uniqMd5 = {};
  const reffile1Elements = []; const reffile2Elements = [];
  const sortedKeys = Object.keys(md5sums).sort();
  for (let i = 0; i < sortedKeys.length; i++) {
    const md5sum = sortedKeys[i];
    if (md5sums[md5sum] > 1) { sameMd5[md5sum] = true; }
      else {
        uniqMd5[md5sum] = true;
        if (md5sum in reffile1) { reffile1Elements.push(md5sum); }
          else { reffile2Elements.push(md5sum); } } }

  const rowPairRefFilesElements = [];
  const maxLength = ( reffile1Elements.length > reffile2Elements.length) ? reffile1Elements.length : reffile2Elements.length;
  const sortedSameKeys = Object.keys(sameMd5).sort();

  const element0 = GenerateFieldLabel('redundant ' + fieldName, 'unlock');
  sortedSameKeys.forEach((md5sum) => {
    let element1 = (<div></div>); let element2 = (<div></div>);
    let swapColor1 = false; let swapColor2 = false; let toggle1 = false; let toggle2 = false;
    let keepClass1 = 'div-merge-keep'; let keepClass2 = 'div-merge-obsolete';
    if (md5sum in reffile1) {
      if (reffile1[md5sum]['toggle'] !== null && reffile1[md5sum]['toggle'] !== '') { toggle1 = reffile1[md5sum]['toggle']; }
      if ( toggle1 ) { swapColor1 = !swapColor1; }
      keepClass1 = (swapColor1) ? 'div-merge-obsolete' : 'div-merge-keep';
      element1 = (<div className={`div-merge ${keepClass1}`} onClick={() => {
                    dispatch(mergeToggleIndependent(fieldName, 1, reffile1[md5sum]['index'], null));
                    if (md5sum in reffile2) { dispatch(mergeToggleIndependent(fieldName, 2, reffile2[md5sum]['index'], null)) } } }
                  >{reffile1[md5sum]['display_name']}.{reffile1[md5sum]['file_extension']} &nbsp;&nbsp; {reffile1[md5sum]['file_class']}</div>); }
    if (md5sum in reffile2) {
      if (reffile2[md5sum]['toggle'] !== null && reffile2[md5sum]['toggle'] !== '') { toggle2 = reffile2[md5sum]['toggle']; }
      if ( toggle2 ) { swapColor2 = !swapColor2; }
      keepClass2 = (swapColor2) ? 'div-merge-keep' : 'div-merge-obsolete';
      element2 = (<div className={`div-merge ${keepClass2}`}  onClick={() => {
                    if (md5sum in reffile1) { dispatch(mergeToggleIndependent(fieldName, 1, reffile1[md5sum]['index'], null)); }
                    dispatch(mergeToggleIndependent(fieldName, 2, reffile2[md5sum]['index'], null)) } }
                  >{reffile2[md5sum]['display_name']}.{reffile2[md5sum]['file_extension']} &nbsp;&nbsp; {reffile2[md5sum]['file_class']}</div>);
    }
    rowPairRefFilesElements.push(
      <Row key={`toggle reffile samemd5 ${md5sum}`}>
        <Col sm="2" >{element0}</Col>
        <Col sm="5" >{element1}</Col>
        <Col sm="5" >{element2}</Col>
      </Row>);
  });

  rowPairRefFilesElements.push(<RowDivider key="reffiles_divider" />);
  const element0Lock = GenerateFieldLabel('unique ' + fieldName, 'lock');
  for (let i = 0; i < maxLength; i++) {
    const element1 = (reffile1Elements[i] !== undefined) ? (<div className={`div-merge div-merge-keep`}>{reffile1[reffile1Elements[i]]['display_name']}.{reffile1[reffile1Elements[i]]['file_extension']} &nbsp;&nbsp; {reffile1[reffile1Elements[i]]['file_class']}</div>) : '';
    const element2 = (reffile2Elements[i] !== undefined) ? (<div className={`div-merge div-merge-keep`}>{reffile2[reffile2Elements[i]]['display_name']}.{reffile2[reffile2Elements[i]]['file_extension']} &nbsp;&nbsp; {reffile2[reffile2Elements[i]]['file_class']}</div>) : '';
    rowPairRefFilesElements.push(
      <Row key={`toggle reffile uniqmd5 ${i}`}>
        <Col sm="2" >{element0Lock}</Col>
        <Col sm="5" >{element1}</Col>
        <Col sm="5" >{element2}</Col>
      </Row>);
  }
  return (<>{rowPairRefFilesElements}</>);
} // const RowDisplayPairReferenceFiles


function deriveWorkflowData(referenceMeta1, referenceMeta2, atpOntology) {
  const fieldName = 'workflow_tags';
  const fileupload1 = {}; const fileupload2 = {}; const fileuploadMods = {};
  const curatability1 = {}; const curatability2 = {}; const curatabilityMods = {};
  const otherworkflow1 = {}; const otherworkflow2 = {}; const otherworkflowMods = {};
  if (referenceMeta1['referenceJson'][fieldName] !== null ) {
    for (const [index, val1] of referenceMeta1['referenceJson'][fieldName].entries()) {
      const reference_workflow_tag_id = val1['reference_workflow_tag_id']
      let mod = 'no_mod'; let atp = 'no_atp'; let toggle = false;
      if ('mod_abbreviation' in val1 && val1['mod_abbreviation'] !== null && val1['mod_abbreviation'] !== '') { mod = val1['mod_abbreviation']; }
      if ('workflow_tag_id' in val1 && val1['workflow_tag_id'] !== null && val1['workflow_tag_id'] !== '') { atp = val1['workflow_tag_id']; }
      if ('toggle' in val1 && val1['toggle'] !== null && val1['toggle'] !== '') { toggle = val1['toggle']; }
      if (atp in atpOntology['ATP:0000140']) {
          fileuploadMods[mod] = true;
          fileupload1[mod] = { 'atp': atp, 'id': reference_workflow_tag_id, 'index': index, 'toggle': toggle } }
        else if (atp in atpOntology['ATP:0000102']) {
          curatabilityMods[mod] = true;
          curatability1[mod] = { 'atp': atp, 'id': reference_workflow_tag_id, 'index': index, 'toggle': toggle } }
        else {
          // this is binning all other workflows into otherworkflow, only allowing one per mod.  This won't be right when other workflows exist.
          otherworkflowMods[mod] = true;
          otherworkflow1[mod] = { 'atp': atp, 'id': reference_workflow_tag_id, 'index': index, 'toggle': toggle } } } }
  if (referenceMeta2['referenceJson'][fieldName] !== null ) {
    for (const [index, val2] of referenceMeta2['referenceJson'][fieldName].entries()) {
      const reference_workflow_tag_id = val2['reference_workflow_tag_id']
      let mod = 'no_mod'; let atp = 'no_atp'; let toggle = false;
      if ('mod_abbreviation' in val2 && val2['mod_abbreviation'] !== null && val2['mod_abbreviation'] !== '') { mod = val2['mod_abbreviation']; }
      if ('workflow_tag_id' in val2 && val2['workflow_tag_id'] !== null && val2['workflow_tag_id'] !== '') { atp = val2['workflow_tag_id']; }
      if ('toggle' in val2 && val2['toggle'] !== null && val2['toggle'] !== '') { toggle = val2['toggle']; }
      if (atp in atpOntology['ATP:0000140']) {
          fileuploadMods[mod] = true;
          fileupload2[mod] = { 'atp': atp, 'id': reference_workflow_tag_id, 'index': index, 'toggle': toggle } }
        else if (atp in atpOntology['ATP:0000102']) {
          curatabilityMods[mod] = true;
          curatability2[mod] = { 'atp': atp, 'id': reference_workflow_tag_id, 'index': index, 'toggle': toggle } }
        else {
          // this is binning all other workflows into otherworkflow, only allowing one per mod.  This won't be right when other workflows exist.
          otherworkflowMods[mod] = true;
          otherworkflow2[mod] = { 'atp': atp, 'id': reference_workflow_tag_id, 'index': index, 'toggle': toggle } } } }
  const newSortedWorkflow = {};
  newSortedWorkflow['fileupload1'] = fileupload1;
  newSortedWorkflow['fileupload2'] = fileupload2;
  newSortedWorkflow['fileuploadMods'] = fileuploadMods;
  newSortedWorkflow['curatability1'] = curatability1;
  newSortedWorkflow['curatability2'] = curatability2;
  newSortedWorkflow['curatabilityMods'] = curatabilityMods;
  newSortedWorkflow['otherworkflow1'] = otherworkflow1;
  newSortedWorkflow['otherworkflow2'] = otherworkflow2;
  newSortedWorkflow['otherworkflowMods'] = otherworkflowMods;
  return newSortedWorkflow;
} // function deriveWorkflowData(referenceMeta1, referenceMeta2)

const RowDisplayPairTopicEntityTags = ({fieldName, referenceMeta1, referenceMeta2, referenceSwap, hasPmid, pmidKeepReference}) => {
  const dispatch = useDispatch();
  const element0 = GenerateFieldLabel(fieldName, 'lock');
  let element1 = (<div>Loading</div>); let element2 = (<div>Loading</div>);
  if (referenceMeta1['referenceJson'][fieldName].length === 0) { element1 = (<div>No Data</div>); }
    else {
      const url1 = '/Biblio/?action=entity&referenceCurie=' + referenceMeta1.curie;
      element1 = (<div>Confirm data at <a href={url1} target="_blank" rel="noreferrer noopener">{referenceMeta1.curie}</a> then click this checkbox <Form.Check inline type="checkbox" id="confirmTet1" onChange={(evt) => dispatch(changeFieldTetCheckbox(evt, 'referenceMeta1', true)) } /></div>); }
  if (referenceMeta2['referenceJson'][fieldName].length === 0) { element2 = (<div>No Data</div>); }
    else {
      const url2 = '/Biblio/?action=entity&referenceCurie=' + referenceMeta2.curie;
      element2 = (<div>Confirm data at <a href={url2} target="_blank" rel="noreferrer noopener">{referenceMeta2.curie}</a> then click this checkbox <Form.Check inline type="checkbox" id="confirmTet2" onChange={(evt) => dispatch(changeFieldTetCheckbox(evt, 'referenceMeta2', true)) } /></div>); }
  return (
      <Row key={`topic_entity_tags `}>
        <Col sm="2" >{element0}</Col>
        <Col sm="5" >{element1}</Col>
        <Col sm="5" >{element2}</Col>
      </Row>);
} // const RowDisplayPairTopicEntityTags


const RowDisplayPairWorkflowTags = ({fieldName, referenceMeta1, referenceMeta2, referenceSwap, hasPmid, pmidKeepReference}) => {
  const accessToken = useSelector(state => state.isLogged.accessToken);
  const atpOntology = useSelector(state => state.merge.atpOntology);
  const ateamResults = useSelector(state => state.merge.ateamResults);
  const atpParents = useSelector(state => state.merge.atpParents);
  const dispatch = useDispatch();

  const sortedWorkflow = deriveWorkflowData(referenceMeta1, referenceMeta2, atpOntology);

  if ( (referenceMeta1['referenceJson'][fieldName] === null ) &&
       (referenceMeta2['referenceJson'][fieldName] === null ) ) { return null; }

  const rowPairWorkflowTagElements = [];

  if (atpParents.length > ateamResults) {
    rowPairWorkflowTagElements.push(
      <Row key='querying alert'><Col sm="12"><Alert variant="danger" dismissible>Querying A-Team ATP values, do not proceed</Alert></Col></Row>); }

  const element0_fileupload = GenerateFieldLabel(fieldName + ': file upload', 'lock');
  Object.keys(sortedWorkflow['fileuploadMods']).sort().forEach((mod) => {
    let element1 = (<div></div>); let element2 = (<div></div>);
    let swapColor1 = false; let swapColor2 = false;
    let keepClass1 = 'div-merge-keep'; let keepClass2 = 'div-merge-obsolete';
    let priority1 = 0; let priority2 = 0;

    if (mod in sortedWorkflow['fileupload1']) {
      priority1 = atpOntology['ATP:0000140'][sortedWorkflow['fileupload1'][mod]['atp']]['priority']; }
    if (mod in sortedWorkflow['fileupload2']) {
      priority2 = atpOntology['ATP:0000140'][sortedWorkflow['fileupload2'][mod]['atp']]['priority']; }

    if (priority2 > priority1) {
      swapColor1 = !swapColor1;  swapColor2 = !swapColor2;
      keepClass2 = 'div-merge-keep'; keepClass1 = 'div-merge-obsolete'; }

    if (mod in sortedWorkflow['fileupload1']) {
      const atp1 = sortedWorkflow['fileupload1'][mod]['atp'];
      const name1 = atpOntology['ATP:0000140'][atp1]['name'];
      element1 = (<div className={`div-merge ${keepClass1}`}>{mod} &nbsp;&nbsp; {atp1} &nbsp; {name1}</div>); }
    if (mod in sortedWorkflow['fileupload2']) {
      const atp2 = sortedWorkflow['fileupload2'][mod]['atp'];
      const name2 = atpOntology['ATP:0000140'][atp2]['name'];
      element2 = (<div className={`div-merge ${keepClass2}`}>{mod} &nbsp;&nbsp; {atp2} &nbsp; {name2}</div>); }
    rowPairWorkflowTagElements.push(
      <Row key={`workflow_tag file_upload ${mod}`}>
        <Col sm="2" >{element0_fileupload}</Col>
        <Col sm="5" >{element1}</Col>
        <Col sm="5" >{element2}</Col>
      </Row>);
  });

  const element0_curatability = GenerateFieldLabel(fieldName + ': curatability', 'unlock');
  Object.keys(sortedWorkflow['curatabilityMods']).sort().forEach((mod) => {
    let element1 = (<div></div>); let element2 = (<div></div>);
    let swapColor1 = false; let swapColor2 = false; let toggle1 = false; let toggle2 = false;
    let keepClass1 = 'div-merge-keep'; let keepClass2 = 'div-merge-obsolete';
    if (mod in sortedWorkflow['curatability1']) {
      const wf1 = sortedWorkflow['curatability1'][mod];
      if (wf1['toggle'] !== false) { toggle1 = wf1['toggle']; }
      if ( toggle1 ) { swapColor1 = !swapColor1; }
      keepClass1 = (swapColor1) ? 'div-merge-obsolete' : 'div-merge-keep';
      const atp1 = wf1['atp'];
      const name1 = atpOntology['ATP:0000102'][atp1]['name'];
      element1 = (<div className={`div-merge ${keepClass1}`}  onClick={() => {
                    if (mod in sortedWorkflow['curatability2']) { dispatch(mergeToggleIndependent(fieldName, 2, sortedWorkflow['curatability2'][mod]['index'], null)); }
                    dispatch(mergeToggleIndependent(fieldName, 1, wf1['index'], null)) } }
                  >{mod} &nbsp;&nbsp; {atp1} &nbsp; {name1}</div>); }
    if (mod in sortedWorkflow['curatability2']) {
      const wf2 = sortedWorkflow['curatability2'][mod];
      if (wf2['toggle'] !== false) { toggle2 = wf2['toggle']; }
      if ( toggle2 ) { swapColor2 = !swapColor2; }
      keepClass2 = (swapColor2) ? 'div-merge-keep' : 'div-merge-obsolete';
      const atp2 = wf2['atp'];
      const name2 = atpOntology['ATP:0000102'][atp2]['name'];
      element2 = (<div className={`div-merge ${keepClass2}`}  onClick={() => {
                    if (mod in sortedWorkflow['curatability1']) { dispatch(mergeToggleIndependent(fieldName, 1, sortedWorkflow['curatability1'][mod]['index'], null)); }
                    dispatch(mergeToggleIndependent(fieldName, 2, wf2['index'], null)) } }
                  >{mod} &nbsp;&nbsp; {atp2} &nbsp; {name2}</div>); }
    rowPairWorkflowTagElements.push(
      <Row key={`toggle workflow_tag curatability ${mod}`}>
        <Col sm="2" >{element0_curatability}</Col>
        <Col sm="5" >{element1}</Col>
        <Col sm="5" >{element2}</Col>
      </Row>);
  });

  const element0_unaccountedfor = GenerateFieldLabel(fieldName + ': unaccounted for', 'lock');
  Object.keys(sortedWorkflow['otherworkflowMods']).sort().forEach((mod) => {
    let element1 = (<div></div>); let element2 = (<div></div>);
    let swapColor1 = false; let swapColor2 = false;
    let keepClass1 = 'div-merge-keep'; let keepClass2 = 'div-merge-obsolete';
    if (mod in sortedWorkflow['otherworkflow1']) {
      const atp1 = sortedWorkflow['otherworkflow1'][mod]['atp'];
      element1 = (<div className={`div-merge ${keepClass1}`}>{mod} &nbsp;&nbsp; {atp1}</div>); }
    if (mod in sortedWorkflow['otherworkflow2']) {
      const atp2 = sortedWorkflow['otherworkflow2'][mod]['atp'];
      element2 = (<div className={`div-merge ${keepClass2}`}>{mod} &nbsp;&nbsp; {atp2}</div>); }
    rowPairWorkflowTagElements.push(
      <Row key={`workflow_tag unaccounted_for ${mod}`}>
        <Col sm="2" >{element0_unaccountedfor}</Col>
        <Col sm="5" >{element1}</Col>
        <Col sm="5" >{element2}</Col>
      </Row>);
  });

  return (<>{rowPairWorkflowTagElements}</>);
} // const RowDisplayPairWorkflowTags

const RowDisplayPairAuthors = ({fieldName, referenceMeta1, referenceMeta2, referenceSwap, hasPmid, pmidKeepReference}) => {
  const dispatch = useDispatch();
  if ( (referenceMeta1['referenceJson'][fieldName] === null ) &&
       (referenceMeta2['referenceJson'][fieldName] === null ) ) { return null; }
  const rowPairAuthorsElements = [];
  const author1Elements = [];
  const author2Elements = [];
  let maxLength = 0;
  if (referenceMeta1['referenceJson'][fieldName] !== null && referenceMeta1['referenceJson'][fieldName].length > maxLength) {
    maxLength = referenceMeta1['referenceJson'][fieldName].length; }
  if (referenceMeta2['referenceJson'][fieldName] !== null && referenceMeta2['referenceJson'][fieldName].length > maxLength) {
    maxLength = referenceMeta2['referenceJson'][fieldName].length; }
  const autFields = ['first_name', 'last_name', 'name', 'order', 'corresponding_author', 'first_author', 'toggle'];
  let maxOrder = 0;
  const isLocked = GenerateIsLocked(fieldName, hasPmid);
  const element0 = GenerateFieldLabel(fieldName, isLocked);
  for (let i = 0; i < maxLength; i++) {
    let element1 = (<div></div>); let element2 = (<div></div>);
    let keepClass1 = 'div-merge-keep'; let keepClass2 = 'div-merge-obsolete';
    let string1 = ''; let string2 = '';
    let swapColor1 = false; let swapColor2 = false;
    if ( ( fieldsPubmedUnlocked.includes(fieldName) || fieldsPubmedLocked.includes(fieldName) || fieldsPubmedOnly.includes(fieldName) ) &&
         (pmidKeepReference === 2) ) { swapColor1 = !swapColor1; swapColor2 = !swapColor2; }
    // if (keepReference === 2) { swapColor1 = !swapColor1; swapColor2 = !swapColor2; }
    if (referenceMeta1['referenceJson'][fieldName] !== null &&
        referenceMeta1['referenceJson'][fieldName][i] !== null && referenceMeta1['referenceJson'][fieldName][i] !== undefined) {
      let aut1 = referenceMeta1['referenceJson'][fieldName][i];
      let aut1Data = {};
      autFields.forEach( (x) => { aut1Data[x] = (aut1[x] !== null && aut1[x] !== '') ? aut1[x] : ''; } );
      aut1Data['orcid'] = ('orcid' in aut1 && aut1['orcid'] !== null) ?  aut1['orcid'] : '';
      if ( aut1Data['toggle'] ) { swapColor1 = !swapColor1; }
      keepClass1 = (swapColor1) ? 'div-merge-obsolete' : 'div-merge-keep';
      // console.log('toggle1 swapColor1 ' + swapColor1 + ' on index ' + i)
      if ( aut1Data['first_name'] !== '' && aut1Data['last_name'] !== '') {
        aut1Data['name'] = aut1Data['first_name'] + ' ' + aut1Data['last_name'] }
      else if ( aut1Data['first_name'] !== '') { aut1Data['name'] = aut1Data['first_name'] }
      else if ( aut1Data['last_name'] !== '') { aut1Data['name'] = aut1Data['last_name'] }
      string1 = aut1Data['order'] + ' - ' + aut1Data['name'];
      if (aut1Data['order'] > maxOrder) { maxOrder = aut1Data['order']; }
      if ( aut1Data['orcid'] !== '') { string1 += ' - ' + aut1Data['orcid']; }
//       if ( aut1Data['corresponding_author'] !== true) { string1 += " <Badge>corresponding</Badge>"; }
      element1 = (<div className={`div-merge ${keepClass1}`} onClick={() => dispatch(mergeToggleIndependent(fieldName, 1, i, null))} >{string1}
        { (aut1Data['first_author'] === true) && <> <Badge variant="secondary">first</Badge></> }
        { (aut1Data['corresponding_author'] === true) && <> <Badge variant="secondary">corresponding</Badge></> }
        </div>);
      author1Elements[aut1Data['order'] - 1] = element1; }
    if (referenceMeta2['referenceJson'][fieldName] !== null &&
        referenceMeta2['referenceJson'][fieldName][i] !== null && referenceMeta2['referenceJson'][fieldName][i] !== undefined) {
      let aut2 = referenceMeta2['referenceJson'][fieldName][i];
      let aut2Data = {};
      autFields.forEach( (x) => { aut2Data[x] = (aut2[x] !== null && aut2[x] !== '') ? aut2[x] : ''; } );
      aut2Data['orcid'] = ('orcid' in aut2 && aut2['orcid'] !== null) ? aut2['orcid'] : '';
      if ( aut2Data['toggle'] ) { swapColor2 = !swapColor2; }
      keepClass2 = (swapColor2) ? 'div-merge-keep' : 'div-merge-obsolete';
      // console.log('toggle2 swapColor2 ' + swapColor2 + ' on index ' + i)
      if ( aut2Data['first_name'] !== '' && aut2Data['last_name'] !== '') {
        aut2Data['name'] = aut2Data['first_name'] + ' ' + aut2Data['last_name'] }
      else if ( aut2Data['first_name'] !== '') { aut2Data['name'] = aut2Data['first_name'] }
      else if ( aut2Data['last_name'] !== '') { aut2Data['name'] = aut2Data['last_name'] }
      string2 = aut2Data['order'] + ' - ' + aut2Data['name'];
      if (aut2Data['order'] > maxOrder) { maxOrder = aut2Data['order']; }
      if ( aut2Data['orcid'] !== '') { string2 += ' - ' + aut2Data['orcid']; }
      element2 = (<div className={`div-merge ${keepClass2}`} onClick={() => dispatch(mergeToggleIndependent(fieldName, 2, i, null))} >{string2}
        { (aut2Data['first_author'] === true) && <> <Badge variant="secondary">first</Badge></> }
        { (aut2Data['corresponding_author'] === true) && <> <Badge variant="secondary">corresponding</Badge></> }
        </div>);
      author2Elements[aut2Data['order'] - 1] = element2; }
  }
  for (let i = 0; i < maxOrder; i++) {
    const element1 = (author1Elements[i] !== undefined) ? author1Elements[i] : '';
    const element2 = (author2Elements[i] !== undefined) ? author2Elements[i] : '';
    rowPairAuthorsElements.push(
      <Row key={`toggle aut ${i}`}>
        <Col sm="2" >{element0}</Col>
        <Col sm="5" >{element1}</Col>
        <Col sm="5" >{element2}</Col>
      </Row>);
  }
  return (<>{rowPairAuthorsElements}</>);
} // const RowDisplayPairAuthors

const RowDisplayPairModReferenceTypes = ({fieldName, referenceMeta1, referenceMeta2, referenceSwap, hasPmid}) => {
  const dispatch = useDispatch();
  if ( (referenceMeta1['referenceJson'][fieldName] === null ) &&
       (referenceMeta2['referenceJson'][fieldName] === null ) ) { return null; }
  const rowPairModReferenceTypesElements = []
  let maxLength = 0;
  if (referenceMeta1['referenceJson'][fieldName] !== null && referenceMeta1['referenceJson'][fieldName].length > maxLength) {
    maxLength = referenceMeta1['referenceJson'][fieldName].length; }
  if (referenceMeta2['referenceJson'][fieldName] !== null && referenceMeta2['referenceJson'][fieldName].length > maxLength) {
    maxLength = referenceMeta2['referenceJson'][fieldName].length; }
  for (let i = 0; i < maxLength; i++) { 
    const isLocked = GenerateIsLocked(fieldName, hasPmid);
    const element0 = GenerateFieldLabel(fieldName, isLocked);
    let element1 = (<div></div>); let element2 = (<div></div>);
    let keepClass1 = 'div-merge-keep'; let keepClass2 = 'div-merge-obsolete';
    let string1 = ''; let string2 = '';
    let swapColor1 = false; let swapColor2 = false;
    // if (keepReference === 2) { swapColor1 = !swapColor1; swapColor2 = !swapColor2; }
    if (referenceMeta1['referenceJson'][fieldName] !== null &&
        referenceMeta1['referenceJson'][fieldName][i] !== null && referenceMeta1['referenceJson'][fieldName][i] !== undefined) {
      let mrt1 = referenceMeta1['referenceJson'][fieldName][i];
      let src1 = ''; let rt1 = ''; let toggle1 = false;
      if (mrt1['mod_abbreviation'] !== null && mrt1['mod_abbreviation'] !== '') { src1 = mrt1['mod_abbreviation']; }
      if (mrt1['reference_type'] !== null && mrt1['reference_type'] !== '') { rt1 = mrt1['reference_type']; }
      if (mrt1['toggle'] !== null && mrt1['toggle'] !== '') { toggle1 = mrt1['toggle']; }
      if ( toggle1 ) { swapColor1 = !swapColor1; }
      keepClass1 = (swapColor1) ? 'div-merge-obsolete' : 'div-merge-keep';
      // console.log('toggle1 swapColor1 ' + swapColor1 + ' on index ' + i)
      if (src1 && rt1) { string1 = src1 + ' - ' + rt1; }
      element1 = (<div className={`div-merge ${keepClass1}`} onClick={() => dispatch(mergeToggleIndependent(fieldName, 1, i, null))} >{string1}</div>); }
    if (referenceMeta2['referenceJson'][fieldName] !== null &&
        referenceMeta2['referenceJson'][fieldName][i] !== null && referenceMeta2['referenceJson'][fieldName][i] !== undefined) {
      let mrt2 = referenceMeta2['referenceJson'][fieldName][i];
      let src2 = ''; let rt2 = ''; let toggle2 = false;
      if (mrt2['mod_abbreviation'] !== null && mrt2['mod_abbreviation'] !== '') { src2 = mrt2['mod_abbreviation']; }
      if (mrt2['reference_type'] !== null && mrt2['reference_type'] !== '') { rt2 = mrt2['reference_type']; }
      if (mrt2['toggle'] !== null && mrt2['toggle'] !== '') { toggle2 = mrt2['toggle']; }
      if ( toggle2 ) { swapColor2 = !swapColor2; }
      keepClass2 = (swapColor2) ? 'div-merge-keep' : 'div-merge-obsolete';
      // console.log('toggle2 swapColor2 ' + swapColor2 + ' on index ' + i)
      if (src2 && rt2) { string2 = src2 + ' - ' + rt2; }
      element2 = (<div className={`div-merge ${keepClass2}`} onClick={() => dispatch(mergeToggleIndependent(fieldName, 2, i, null))} >{string2}</div>); }
    rowPairModReferenceTypesElements.push(
      <Row key={`toggle mrt ${i}`}>
        <Col sm="2" >{element0}</Col>
        <Col sm="5" >{element1}</Col>
        <Col sm="5" >{element2}</Col>
      </Row>);
  }
  return (<>{rowPairModReferenceTypesElements}</>);
} // const RowDisplayPairModReferenceTypes


const RowDisplayPairPrepublicationPipeline = ({fieldName, referenceMeta1, referenceMeta2, referenceSwap, hasPmid}) => {
  if ( (referenceMeta1['referenceJson'][fieldName] === null ) &&
       (referenceMeta2['referenceJson'][fieldName] === null ) ) { return null; }
  let keepClass1 = (referenceMeta1['referenceJson'][fieldName] === true ) ? 'div-merge-keep' : 'div-merge-obsolete';
  let keepClass2 = (referenceMeta2['referenceJson'][fieldName] === true ) ? 'div-merge-keep' : 'div-merge-obsolete';
  if ( referenceMeta1['referenceJson'][fieldName] === referenceMeta2['referenceJson'][fieldName] ) {
    keepClass1 = 'div-merge-keep'; keepClass2 = 'div-merge-keep'; }
  const element0 = GenerateFieldLabel(fieldName, 'lock');
  let element1 = (<div className={`div-merge ${keepClass1}`} >{referenceMeta1['referenceJson'][fieldName].toString()}</div>);
  let element2 = (<div className={`div-merge ${keepClass2}`} >{referenceMeta2['referenceJson'][fieldName].toString()}</div>);
  return ( <Row key={'toggle prepublication_pipeline'}>
             <Col sm="2" >{element0}</Col>
             <Col sm="5" >{element1}</Col>
             <Col sm="5" >{element2}</Col>
           </Row>);
} // const RowDisplayPairPrepublicationPipeline


const RowDisplayPairModCorpusAssociations = ({fieldName, referenceMeta1, referenceMeta2, referenceSwap, hasPmid}) => {
  const dispatch = useDispatch();
  if ( (referenceMeta1['referenceJson'][fieldName] === null ) &&
       (referenceMeta2['referenceJson'][fieldName] === null ) ) { return null; }
  const rowPairModCorpusAssociationsElements = []

  const mcaMods = {}; const mca1 = {}; const mca2 = {};
  if (referenceMeta1['referenceJson'][fieldName] !== null ) {
    for (const [index, val1] of referenceMeta1['referenceJson'][fieldName].entries()) { 
      if ('mod_abbreviation' in val1 && val1['mod_abbreviation'] !== null && val1['mod_abbreviation'] !== '') {
        mcaMods[val1['mod_abbreviation']] = true;
        let corpus1 = 'needs_review';
        if ('corpus' in val1) {
          if (val1['corpus'] === null) { corpus1 = 'needs_review'; }
          else if (val1['corpus'] === true) { corpus1 = 'inside_corpus'; }
          else if (val1['corpus'] === false) { corpus1 = 'outside_corpus'; } }
        const toggle1 = ('toggle' in val1 && val1['toggle'] !== null && val1['toggle'] !== '') ? val1['toggle'] : null;
        mca1[val1['mod_abbreviation']] = { 'index': index, 'corpus': corpus1, 'toggle': toggle1 }; } } }
  if (referenceMeta2['referenceJson'][fieldName] !== null ) {
    for (const [index, val2] of referenceMeta2['referenceJson'][fieldName].entries()) { 
      if ('mod_abbreviation' in val2 && val2['mod_abbreviation'] !== null && val2['mod_abbreviation'] !== '') {
        mcaMods[val2['mod_abbreviation']] = true;
        let corpus2 = 'needs_review';
        if ('corpus' in val2) {
          if (val2['corpus'] === null) { corpus2 = 'needs_review'; }
          else if (val2['corpus'] === true) { corpus2 = 'inside_corpus'; }
          else if (val2['corpus'] === false) { corpus2 = 'outside_corpus'; } }
        const toggle2 = ('toggle' in val2 && val2['toggle'] !== null && val2['toggle'] !== '') ? val2['toggle'] : null;
        mca2[val2['mod_abbreviation']] = { 'index': index, 'corpus': corpus2, 'toggle': toggle2 }; } } }
  // console.log(mca1); console.log(mca2); console.log(mcaMods);
  const sortedKeys = Object.keys(mcaMods).sort();
  for (let i = 0; i < sortedKeys.length; i++) {
    const isLocked = GenerateIsLocked(fieldName, hasPmid);
    const element0 = GenerateFieldLabel(fieldName, isLocked);
    let element1 = (<div></div>); let element2 = (<div></div>);
    const mod = sortedKeys[i];
    let swapColor1 = false; let swapColor2 = false; let toggle1 = false; let toggle2 = false;
    // if (keepReference === 2) { swapColor1 = !swapColor1; swapColor2 = !swapColor2; }
    let keepClass1 = 'div-merge-keep'; let keepClass2 = 'div-merge-obsolete';
    if (mod in mca1) {
      if (mca1[mod]['toggle'] !== null && mca1[mod]['toggle'] !== '') { toggle1 = mca1[mod]['toggle']; }
      if ( toggle1 ) { swapColor1 = !swapColor1; }
      keepClass1 = (swapColor1) ? 'div-merge-obsolete' : 'div-merge-keep';
      element1 = (<div className={`div-merge ${keepClass1}`} onClick={() => { 
                    dispatch(mergeToggleIndependent(fieldName, 1, mca1[mod]['index'], null));
                    if (mod in mca2) { dispatch(mergeToggleIndependent(fieldName, 2, mca2[mod]['index'], null)) } } }
//                   >{mca1[mod]['index']} - {mod} - {mca1[mod]['corpus']}</div>);
                  >{mod} - {mca1[mod]['corpus']}</div>); }
    if (mod in mca2) {
      if (mca2[mod]['toggle'] !== null && mca2[mod]['toggle'] !== '') { toggle2 = mca2[mod]['toggle']; }
      if ( toggle2 ) { swapColor2 = !swapColor2; }
      keepClass2 = (swapColor2) ? 'div-merge-keep' : 'div-merge-obsolete';
      element2 = (<div className={`div-merge ${keepClass2}`}  onClick={() => { 
                    if (mod in mca1) { dispatch(mergeToggleIndependent(fieldName, 1, mca1[mod]['index'], null)); }
                    dispatch(mergeToggleIndependent(fieldName, 2, mca2[mod]['index'], null)) } }
//                   >{mca2[mod]['index']} - {mod} - {mca2[mod]['corpus']}</div>);
                  >{mod} - {mca2[mod]['corpus']}</div>); }
    rowPairModCorpusAssociationsElements.push(
      <Row key={`toggle mca ${i}`}>
        <Col sm="2" >{element0}</Col>
        <Col sm="5" >{element1}</Col>
        <Col sm="5" >{element2}</Col>
      </Row>);
  }
  return (<>{rowPairModCorpusAssociationsElements}</>);
} // const RowDisplayPairModCorpusAssociations


const RowDisplayPairCrossReferencesValid = ({fieldName, referenceMeta1, referenceMeta2, referenceSwap, hasPmid}) => {
  const dispatch = useDispatch();
  if ( (referenceMeta1['referenceJson'][fieldName] === null ) &&
       (referenceMeta2['referenceJson'][fieldName] === null ) ) { return null; }
  const rowPairCrossReferencesElements = []

  const xrefPrefixes = {}; const xref1 = {}; const xref2 = {};
  if (referenceMeta1['referenceJson'][fieldName] !== null ) {
    for (const [index, val1] of referenceMeta1['referenceJson'][fieldName].entries()) { 
      if ('is_obsolete' in val1 && val1['is_obsolete'] !== null && val1['is_obsolete'] === true) { continue; }
      if ('curie' in val1 && val1['curie'] !== null && val1['curie'] !== '') {
        let xref1Prefix = splitCurie(val1['curie'], 'prefix');
        xrefPrefixes[xref1Prefix] = true;
        const toggle1 = ('toggle' in val1 && val1['toggle'] !== null && val1['toggle'] !== '') ? val1['toggle'] : null;
        xref1[xref1Prefix] = { 'index': index, 'curie': val1['curie'], 'toggle': toggle1 }; } } }
  if (referenceMeta2['referenceJson'][fieldName] !== null ) {
    for (const [index, val2] of referenceMeta2['referenceJson'][fieldName].entries()) { 
      if ('is_obsolete' in val2 && val2['is_obsolete'] !== null && val2['is_obsolete'] === true) { continue; }
      if ('curie' in val2 && val2['curie'] !== null && val2['curie'] !== '') {
        let xref2Prefix = splitCurie(val2['curie'], 'prefix');
        xrefPrefixes[xref2Prefix] = true;
        const toggle2 = ('toggle' in val2 && val2['toggle'] !== null && val2['toggle'] !== '') ? val2['toggle'] : null;
        xref2[xref2Prefix] = { 'index': index, 'curie': val2['curie'], 'toggle': toggle2 }; } } }
  // console.log(xref1); console.log(xref2); console.log(xrefPrefixes);
  const sortedKeys = Object.keys(xrefPrefixes).sort();
  const isLocked = GenerateIsLocked(fieldName, hasPmid);
  const fieldLabel = 'valid ' + fieldName;
  const element0 = GenerateFieldLabel(fieldLabel, isLocked);
  for (let i = 0; i < sortedKeys.length; i++) {
    let element1 = (<div></div>); let element2 = (<div></div>);
    const mod = sortedKeys[i];
    let swapColor1 = false; let swapColor2 = false; let toggle1 = false; let toggle2 = false;
    // if (keepReference === 2) { swapColor1 = !swapColor1; swapColor2 = !swapColor2; }
    let keepClass1 = 'div-merge-keep'; let keepClass2 = 'div-merge-obsolete';
    if (mod in xref1) {
      if (xref1[mod]['toggle'] !== null && xref1[mod]['toggle'] !== '') { toggle1 = xref1[mod]['toggle']; }
      if ( toggle1 ) { swapColor1 = !swapColor1; }
      keepClass1 = (swapColor1) ? 'div-merge-obsolete' : 'div-merge-keep';
      element1 = (<div className={`div-merge ${keepClass1}`} onClick={() => {
                    dispatch(mergeToggleIndependent(fieldName, 1, xref1[mod]['index'], null));
                    if (mod === 'PMID') { dispatch(mergeSwapKeepPmid()) }
                    if (mod in xref2) { dispatch(mergeToggleIndependent(fieldName, 2, xref2[mod]['index'], null)) } } }
//                   >{xref1[mod]['index']} - {mod} - {xref1[mod]['curie']}</div>);
                  >{xref1[mod]['curie']}</div>); }
    if (mod in xref2) {
      if (xref2[mod]['toggle'] !== null && xref2[mod]['toggle'] !== '') { toggle2 = xref2[mod]['toggle']; }
      if ( toggle2 ) { swapColor2 = !swapColor2; }
      keepClass2 = (swapColor2) ? 'div-merge-keep' : 'div-merge-obsolete';
      element2 = (<div className={`div-merge ${keepClass2}`}  onClick={() => {
                    if (mod === 'PMID') { dispatch(mergeSwapKeepPmid()) }
                    if (mod in xref1) { dispatch(mergeToggleIndependent(fieldName, 1, xref1[mod]['index'], null)); }
                    dispatch(mergeToggleIndependent(fieldName, 2, xref2[mod]['index'], null)) } }
//                   >{xref2[mod]['index']} - {mod} - {xref2[mod]['curie']}</div>);
                  >{xref2[mod]['curie']}</div>); }
    rowPairCrossReferencesElements.push(
      <Row key={`toggle valid xref ${i}`}>
        <Col sm="2" >{element0}</Col>
        <Col sm="5" >{element1}</Col>
        <Col sm="5" >{element2}</Col>
      </Row>);
  }
  return (<>{rowPairCrossReferencesElements}</>);
} // const RowDisplayPairCrossReferencesValid

const RowDisplayPairCrossReferencesObsolete = ({fieldName, referenceMeta1, referenceMeta2, referenceSwap, hasPmid, validOrObsolete}) => {
  // const dispatch = useDispatch();
  if ( (referenceMeta1['referenceJson'][fieldName] === null ) &&
       (referenceMeta2['referenceJson'][fieldName] === null ) ) { return null; }
  const rowPairCrossReferencesElements = []

  const xrefPrefixes = {}; const xref1 = {}; const xref2 = {};
  if (referenceMeta1['referenceJson'][fieldName] !== null ) {
    for (const [index, val1] of referenceMeta1['referenceJson'][fieldName].entries()) { 
      if ('is_obsolete' in val1 && val1['is_obsolete'] !== null && val1['is_obsolete'] === false) { continue; }
      if ('curie' in val1 && val1['curie'] !== null && val1['curie'] !== '') {
        let xref1Prefix = splitCurie(val1['curie'], 'prefix');
        xrefPrefixes[xref1Prefix] = true;
        const toggle1 = ('toggle' in val1 && val1['toggle'] !== null && val1['toggle'] !== '') ? val1['toggle'] : null;
        xref1[xref1Prefix] = { 'index': index, 'curie': val1['curie'], 'toggle': toggle1 }; } } }
  if (referenceMeta2['referenceJson'][fieldName] !== null ) {
    for (const [index, val2] of referenceMeta2['referenceJson'][fieldName].entries()) { 
      if ('is_obsolete' in val2 && val2['is_obsolete'] !== null && val2['is_obsolete'] === false) { continue; }
      if ('curie' in val2 && val2['curie'] !== null && val2['curie'] !== '') {
        let xref2Prefix = splitCurie(val2['curie'], 'prefix');
        xrefPrefixes[xref2Prefix] = true;
        const toggle2 = ('toggle' in val2 && val2['toggle'] !== null && val2['toggle'] !== '') ? val2['toggle'] : null;
        xref2[xref2Prefix] = { 'index': index, 'curie': val2['curie'], 'toggle': toggle2 }; } } }
  const sortedKeys = Object.keys(xrefPrefixes).sort();
  const fieldLabel = 'obsolete ' + fieldName;
  const element0 = GenerateFieldLabel(fieldLabel, 'lock');
  for (let i = 0; i < sortedKeys.length; i++) {
    let element1 = (<div></div>); let element2 = (<div></div>);
    const mod = sortedKeys[i];
    let keepClass = 'div-merge-keep';
    if (mod in xref1) {
      element1 = (<div className={`div-merge ${keepClass}`} >{xref1[mod]['curie']}</div>); }
    if (mod in xref2) {
      element2 = (<div className={`div-merge ${keepClass}`} >{xref2[mod]['curie']}</div>); }
    rowPairCrossReferencesElements.push(
      <Row key={`toggle obsolete xref ${i}`}>
        <Col sm="2" >{element0}</Col>
        <Col sm="5" >{element1}</Col>
        <Col sm="5" >{element2}</Col>
      </Row>);
  }
  return (<>{rowPairCrossReferencesElements}</>);
} // const RowDisplayPairCrossReferencesObsolete

const RowDisplayPairReferenceRelations = ({fieldName, referenceMeta1, referenceMeta2, referenceSwap, hasPmid, pmidKeepReference}) => {
  const dispatch = useDispatch();
  if ( (referenceMeta1['referenceJson'][fieldName]['to_references'] === null ) &&
       (referenceMeta1['referenceJson'][fieldName]['from_references'] === null ) &&
       (referenceMeta2['referenceJson'][fieldName]['to_references'] === null ) &&
       (referenceMeta2['referenceJson'][fieldName]['from_references'] === null ) ) { return null; }
  const rowPairReferenceRelationsElements = []
  const [agrkbs1, agrkbs2, sameAgrkbs, uniqAgrkbs1, uniqAgrkbs2] = deriveRefeferenceRelationsAgrkbs(referenceMeta1['referenceJson'][fieldName], referenceMeta2['referenceJson'][fieldName]);

  const comcorReverse = Object.fromEntries(Object.entries(comcorMapping).map(a => a.reverse()))

  const element0 = GenerateFieldLabel(fieldName + ': same reference', 'unlock');
  Object.keys(sameAgrkbs).forEach((agrkb) => {
    let element1 = (<div></div>); let element2 = (<div></div>);
    let swapColor1 = false; let swapColor2 = false; let toggle1 = false; let toggle2 = false;
    let keepClass1 = 'div-merge-keep'; let keepClass2 = 'div-merge-obsolete';
    if (agrkb in agrkbs1) {
      if (agrkbs1[agrkb]['toggle'] !== null && agrkbs1[agrkb]['toggle'] !== '') { toggle1 = agrkbs1[agrkb]['toggle']; }
      if ( toggle1 ) { swapColor1 = !swapColor1; }
      keepClass1 = (swapColor1) ? 'div-merge-obsolete' : 'div-merge-keep';
      const relation1 = (agrkbs1[agrkb]['direction'] === 'from') ? comcorReverse[agrkbs1[agrkb]['type']] : agrkbs1[agrkb]['type'];
      element1 = (<div className={`div-merge ${keepClass1}`} onClick={() => {
                    dispatch(mergeToggleIndependent(fieldName, 1, agrkbs1[agrkb]['index'], agrkbs1[agrkb]['subtype']));
                    if (agrkb in agrkbs2) { dispatch(mergeToggleIndependent(fieldName, 2, agrkbs2[agrkb]['index'], agrkbs2[agrkb]['subtype'])) } } }
                  >{relation1} &nbsp;&nbsp; {agrkb}</div>); }
    if (agrkb in agrkbs2) {
      if (agrkbs2[agrkb]['toggle'] !== null && agrkbs2[agrkb]['toggle'] !== '') { toggle2 = agrkbs2[agrkb]['toggle']; }
      if ( toggle2 ) { swapColor2 = !swapColor2; }
      keepClass2 = (swapColor2) ? 'div-merge-keep' : 'div-merge-obsolete';
      const relation2 = (agrkbs2[agrkb]['direction'] === 'from') ? comcorReverse[agrkbs2[agrkb]['type']] : agrkbs2[agrkb]['type'];
      element2 = (<div className={`div-merge ${keepClass2}`}  onClick={() => {
                    if (agrkb in agrkbs1) { dispatch(mergeToggleIndependent(fieldName, 1, agrkbs1[agrkb]['index'], agrkbs1[agrkb]['subtype'])); }
                    dispatch(mergeToggleIndependent(fieldName, 2, agrkbs2[agrkb]['index'], agrkbs2[agrkb]['subtype'])) } }
                  >{relation2} &nbsp;&nbsp; {agrkb}</div>);
    }
    rowPairReferenceRelationsElements.push(
      <Row key={`toggle agrkb sameagrkb ${agrkb}`}>
        <Col sm="2" >{element0}</Col>
        <Col sm="5" >{element1}</Col>
        <Col sm="5" >{element2}</Col>
      </Row>);
  });

  const maxLengthUniq = ( uniqAgrkbs1.length > uniqAgrkbs2.length) ? uniqAgrkbs1.length : uniqAgrkbs2.length;
  rowPairReferenceRelationsElements.push(<RowDivider key="referencerelations_divider" />);
  const element0Lock = GenerateFieldLabel(fieldName + ': unique reference', 'lock');
  for (let i = 0; i < maxLengthUniq; i++) {
    let keepClass1 = 'div-merge-keep'; let keepClass2 = 'div-merge-keep';
    let relation1 = '';
    if (uniqAgrkbs1[i] === undefined) { relation1 = ''; }
      else if (agrkbs1[uniqAgrkbs1[i]] !== undefined) {
        relation1 = (agrkbs1[uniqAgrkbs1[i]]['direction'] === 'from') ? comcorReverse[agrkbs1[uniqAgrkbs1[i]]['type']] : agrkbs1[uniqAgrkbs1[i]]['type']; }
    let relation2 = '';
    if (uniqAgrkbs2[i] === undefined) { relation2 = ''; }
      else if (agrkbs2[uniqAgrkbs2[i]] !== undefined) {
        relation2 = (agrkbs2[uniqAgrkbs2[i]]['direction'] === 'from') ? comcorReverse[agrkbs2[uniqAgrkbs2[i]]['type']] : agrkbs2[uniqAgrkbs2[i]]['type']; }
    if (uniqAgrkbs1[i] === referenceMeta2['referenceJson']['curie']) { keepClass1 = 'div-merge-obsolete'; }
    if (uniqAgrkbs2[i] === referenceMeta1['referenceJson']['curie']) { keepClass2 = 'div-merge-obsolete'; }
    const element1 = (uniqAgrkbs1[i] !== undefined) ? (<div className={`div-merge ${keepClass1}`}>{relation1} &nbsp;&nbsp; {uniqAgrkbs1[i]}</div>) : '';
    const element2 = (uniqAgrkbs2[i] !== undefined) ? (<div className={`div-merge ${keepClass2}`}>{relation2} &nbsp;&nbsp; {uniqAgrkbs2[i]}</div>) : '';
    rowPairReferenceRelationsElements.push(
      <Row key={`toggle reffile uniqmd5 ${i}`}>
        <Col sm="2" >{element0Lock}</Col>
        <Col sm="5" >{element1}</Col>
        <Col sm="5" >{element2}</Col>
      </Row>);
  }

  return (<>{rowPairReferenceRelationsElements}</>);
} // const RowDisplayPairReferenceRelations


const Merge = () => {
  return (
    <div>
      <h4>Merge two References</h4>
      <MergeSelectionSection />
    </div>
  )
}

export default Merge
