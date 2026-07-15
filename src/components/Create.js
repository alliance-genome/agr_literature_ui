import { Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useHistory } from "react-router-dom";
import { useLocation } from 'react-router-dom';

import { api } from '../api';

import { setReferenceCurie } from '../actions/biblioActions';
import { setGetReferenceCurieFlag } from '../actions/biblioActions';
import { resetBiblioIsLoading } from '../actions/biblioActions';
import { setBiblioAction } from '../actions/biblioActions';

import { changeCreateActionToggler } from '../actions/createActions';
import { setCreateActionToggler } from '../actions/createActions';
import { updateButtonCreate } from '../actions/createActions';
import { resetCreateRedirect } from '../actions/createActions';
import { changeCreateField } from '../actions/createActions';
import { changeCreatePmidField } from '../actions/createActions';
import { createQueryPubmed } from '../actions/createActions';
import { changeResourceCurieValue } from '../actions/createActions';
import { createQueryResource } from '../actions/createActions';
import { createResource } from '../actions/createActions';
import { setCreateModalText } from '../actions/createActions';

import ModalGeneric from './biblio/ModalGeneric';

import { enumDict } from './biblio/BiblioEditor';

import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button'
import Spinner from 'react-bootstrap/Spinner'
import Alert from 'react-bootstrap/Alert'


function useGetAccessLevel() {
  const cognitoMod = useSelector(state => state.isLogged.cognitoMod);
  const testerMod = useSelector(state => state.isLogged.testerMod);
  const accessLevel = (testerMod !== 'No') ? testerMod : cognitoMod;
  return accessLevel;
}


const CreatePubmed = () => {
  const dispatch = useDispatch();
  const accessToken = useSelector(state => state.isLogged.accessToken);
  const pmid = useSelector(state => state.create.pmid);
  const pmidTitle = useSelector(state => state.create.pmidTitle);
  const searchPmidLoading = useSelector(state => state.create.searchPmidLoading);
  const createPmidLoading = useSelector(state => state.create.createPmidLoading);
  const modIdent = useSelector(state => state.create.modIdent);
  const modPrefix = useSelector(state => state.create.modPrefix);
  const allianceOnly = useSelector(state => state.create.allianceOnly);
  const pmidQuerySuccess = useSelector(state => state.create.pmidQuerySuccess);
  // const accessLevel = useGetAccessLevel();
  const generalClassName = 'Col-general';


  function createPubmedReference(pmid, allianceOnly) {
    pmid = pmid.replace( /[^\d.]/g, '' );
    let updateJson = { 'pubmed_id': pmid };

    if (allianceOnly) {
      // Alliance-only mode: only create Alliance MOD corpus association
      updateJson['mod_mca'] = 'AGR';
    } else {
      // Normal mode: create with curator's MOD association
      const modCurie = modPrefix + ':' + modIdent;
      const mcaMod = (modPrefix === 'Xenbase') ? 'XB' : modPrefix;
      updateJson['mod_curie'] = modCurie;
      updateJson['mod_mca'] = mcaMod;
      if (modPrefix === 'WB' || modPrefix === 'SGD') { delete updateJson['mod_curie']; }	// do not create an xref for WB and SGD, mca will trigger modID creation in xref
    }

    const subPath = 'reference/add/';
    // For alliance-only, we don't have a modCurie to check, so pass a placeholder
    const modCurieForCheck = allianceOnly ? 'Alliance:new' : (modPrefix + ':' + modIdent);
    let arrayData = [ accessToken, subPath, updateJson, 'POST', 0, null, null]
    dispatch(updateButtonCreate(arrayData, 'pmid', modCurieForCheck));
  }

  // Determine if create button should be disabled
  // Alliance-only mode doesn't require MOD ID
  const isCreateDisabled = allianceOnly
    ? false
    : ( (modPrefix !== 'WB') && (modPrefix !== 'SGD') && (modIdent === '') );
  return (
    <Container>
    <Form.Group as={Row} key="Pmid" >
      <Form.Label column sm="2" className={`${generalClassName}`} >PMID</Form.Label>
      <Col sm="6" className={`${generalClassName}`}>
        <Form.Control as="input" name="pmid" id="pmid" type="input" value={pmid} className={`form-control`} placeholder="12345678" onChange={(e) => dispatch(changeCreatePmidField(e))} />
      </Col>
      <Col sm="4" className={`${generalClassName}`}>
        <Button id={`button query pubmed`} variant="outline-secondary" onClick={() => dispatch(createQueryPubmed(pmid))} >
        {searchPmidLoading ? <Spinner animation="border" size="sm"/> : <span>Query PubMed ID</span> }
        </Button>
      </Col>
    </Form.Group>
    <Form.Group as={Row} key="PmidTitle" >
      <Form.Label column sm="2" className={`${generalClassName}`} >PubMed Title</Form.Label>
      <Col sm="10" className={`${generalClassName}`}>
        <Form.Control as="input" name="pmidTitle" id="pmidTitle" type="input" value={pmidTitle} disabled="disabled" className={`form-control`} />
      </Col>
    </Form.Group>
    { pmidQuerySuccess && (
      <>
        <Form.Group as={Row} key="allianceOnlyPubmed" >
          <Col sm="12">
            <Form.Check
              type="checkbox"
              id="allianceOnly"
              label="Only create Alliance ID and MOD corpus association for Alliance"
              checked={allianceOnly}
              onChange={(e) => dispatch(changeCreateField({target: {id: 'allianceOnly', value: e.target.checked }}))}
            />
          </Col>
        </Form.Group>
        {!allianceOnly && <ModCurieInput />}
        <Button id={`button create pubmed`} variant="outline-secondary" disabled={isCreateDisabled ? "disabled" : ""} onClick={() => createPubmedReference(pmid, allianceOnly)} >
          {createPmidLoading ? <Spinner animation="border" size="sm"/> : <span>Create a PubMed reference</span> }
        </Button>
      </>
    ) }
    </Container>);
} // const CreatePubmed

const CreateAlliance = () => {
  const dispatch = useDispatch();
  const accessToken = useSelector(state => state.isLogged.accessToken);
  const createAllianceLoading = useSelector(state => state.create.createAllianceLoading);
  const modIdent = useSelector(state => state.create.modIdent);
  const modPrefix = useSelector(state => state.create.modPrefix);
  const allianceOnly = useSelector(state => state.create.allianceOnly);
  const mcaMod = (modPrefix === 'Xenbase') ? 'XB' : modPrefix;

  function createAllianceReference(modPrefix, modIdent, allianceOnly) {
    const subPath = 'reference/';
    let updateJson = { 'title': 'placeholder title', 'category': 'other' };

    if (allianceOnly) {
      // Alliance-only mode: only create Alliance MOD corpus association, no cross_references required
      updateJson['mod_corpus_associations'] = [ { 'mod_abbreviation': 'AGR', 'mod_corpus_sort_source': 'manual_creation', 'corpus': true } ];
    } else {
      // Normal mode: create with curator's MOD association and cross_references
      const modCurie = modPrefix + ':' + modIdent;
      updateJson['mod_corpus_associations'] = [ { 'mod_abbreviation': mcaMod, 'mod_corpus_sort_source': 'manual_creation', 'corpus': true } ];
      updateJson['cross_references'] = [ { 'curie': modCurie, 'pages': [ 'reference' ], 'is_obsolete': false } ];
      if (modPrefix === 'WB' || modPrefix === 'SGD') { delete updateJson['cross_references']; }	// do not create an xref for WB and SGD, mca will trigger modID creation in xref
    }

    // For alliance-only, we don't have a modCurie to check, so pass a placeholder
    const modCurieForCheck = allianceOnly ? 'Alliance:new' : (modPrefix + ':' + modIdent);
    let arrayData = [ accessToken, subPath, updateJson, 'POST', 0, null, null]
    dispatch(updateButtonCreate(arrayData, 'alliance', modCurieForCheck))
  }

  // Determine if create button should be disabled
  // Alliance-only mode doesn't require MOD ID
  const isCreateDisabled = allianceOnly
    ? false
    : ( (modPrefix !== 'WB') && (modPrefix !== 'SGD') && (modIdent === '') );

  return (
    <Container>
      <Form.Group as={Row} key="allianceOnly" >
        <Col sm="12">
          <Form.Check
            type="checkbox"
            id="allianceOnly"
            label="Only create Alliance ID and MOD corpus association Alliance"
            checked={allianceOnly}
            onChange={(e) => dispatch(changeCreateField({target: {id: 'allianceOnly', value: e.target.checked }}))}
          />
        </Col>
      </Form.Group>
      {!allianceOnly && <ModCurieInput />}
      <Button id={`button create alliance`} variant="outline-secondary" disabled={isCreateDisabled ? "disabled" : ""} onClick={() => createAllianceReference(modPrefix, modIdent, allianceOnly)} >
        {createAllianceLoading ? <Spinner animation="border" size="sm"/> : <span>Create an Alliance reference</span> }
      </Button>
    </Container>);
} // const CreateAlliance

const ModCurieInput = () => {
  const dispatch = useDispatch();
  const modIdent = useSelector(state => state.create.modIdent);
  const modPrefix = useSelector(state => state.create.modPrefix);
  const generalClassName = 'Col-general';
  return (
      <Form.Group as={Row} key="modXref" >
        <Form.Label column sm="2" className={`${generalClassName}`} >MOD ID</Form.Label>
        <Col sm="2" className={`${generalClassName}`}>{modPrefix}</Col>
        <Col sm="6" className={`${generalClassName}`}>
          {modPrefix === 'WB' ? (
            <div>This will generate a WB:WBPaper ID</div>
          ) : modPrefix === 'SGD' ? (
            <div>This will generate a new SGDID</div>
          ) : (
            <Form.Control
              as="input"
              name="modIdent"
              id="modIdent"
              type="input"
              value={modIdent}
              className={`form-control`}
              placeholder="12345"
              onChange={(e) => dispatch(changeCreateField(e))}
            />
          )}
       </Col>
      </Form.Group>);
} // const ModCurieInput


const CreateResource = () => {
  const dispatch = useDispatch();
  const resourceCuriePrefix = useSelector(state => state.create.resourceCuriePrefix);
  const resourceCurieValue = useSelector(state => state.create.resourceCurieValue);
  const resourceTitle = useSelector(state => state.create.resourceTitle);
  const resourceLoading = useSelector(state => state.create.resourceLoading);
  const resourceQuerySuccess = useSelector(state => state.create.resourceQuerySuccess);
  const resourceExistsCuries = useSelector(state => state.create.resourceExistsCuries);
  const resourceCreatedMessage = useSelector(state => state.create.resourceCreatedMessage);
  const resourceError = useSelector(state => state.create.resourceError);
  const generalClassName = 'Col-general';

  return (
    <Container>
    <Form.Group as={Row} key="ResourceCurie" >
      <Form.Label column sm="2" className={`${generalClassName}`} >
        <Form.Control as="select" value={resourceCuriePrefix}
          onChange={(e) => dispatch(changeCreateField({target: {id: 'resourceCuriePrefix', value: e.target.value }}))} >
          <option value="NLM">NLM</option>
          <option value="ISSN">ISSN</option>
        </Form.Control>
      </Form.Label>
      <Col sm="6" className={`${generalClassName}`}>
        <Form.Control as="input" name="resourceCurieValue" id="resourceCurieValue" type="input"
          value={resourceCurieValue} className={`form-control`}
          placeholder="Pick a curie prefix and enter rest of curie"
          onChange={(e) => dispatch(changeResourceCurieValue(e))} />
      </Col>
      <Col sm="4" className={`${generalClassName}`}>
        <Button id="button-query-resource" variant="outline-secondary"
          disabled={resourceLoading === 'query'}
          onClick={() => dispatch(createQueryResource(resourceCuriePrefix, resourceCurieValue))} >
          {resourceLoading === 'query' ? <Spinner animation="border" size="sm"/> : <span>Query Curie</span> }
        </Button>
      </Col>
    </Form.Group>
    <Form.Group as={Row} key="ResourceTitle" >
      <Form.Label column sm="2" className={`${generalClassName}`} >Resource Title</Form.Label>
      <Col sm="10" className={`${generalClassName}`}>
        <Form.Control as="input" name="resourceTitle" id="resourceTitle" type="input"
          value={resourceTitle} disabled="disabled" className={`form-control`} />
      </Col>
    </Form.Group>
    { resourceExistsCuries && resourceExistsCuries.length > 0 && (
      <Form.Group as={Row} key="ResourceExists" >
        <Form.Label column sm="2" className={`${generalClassName}`} >Existing Resources</Form.Label>
        <Col sm="10" className={`${generalClassName}`}>
          {resourceExistsCuries.map((curie, index) => (
            <span key={`resource-curie-${index}`}>
              {index > 0 && ', '}
              {curie}
            </span>
          ))}
        </Col>
      </Form.Group>
    ) }
    { resourceQuerySuccess && (
      <Button id="button-create-resource" variant="outline-secondary"
        disabled={resourceLoading === 'create'}
        onClick={() => dispatch(createResource(resourceCuriePrefix, resourceCurieValue))} >
        {resourceLoading === 'create' ? <Spinner animation="border" size="sm"/> : <span>Create Resource</span> }
      </Button>
    ) }
    { resourceCreatedMessage && (
      <Alert variant="success" className="mt-2">{resourceCreatedMessage}</Alert>
    ) }
    { resourceError && (
      <Alert variant="danger" className="mt-2">{resourceError}</Alert>
    ) }
    </Container>);
} // const CreateResource


const CreateActionToggler = () => {
  const dispatch = useDispatch();
  const createAction = useSelector(state => state.create.createAction);
  let pubmedChecked = '';
  let allianceChecked = '';
  let radioFormPubmedClassname = 'radio-form';
  let radioFormAllianceClassname = 'radio-form';
// to default pubmed
//   let createActionTogglerSelected = 'pubmed';
//   if (createAction === 'alliance') { allianceChecked = 'checked'; createActionTogglerSelected = 'alliance'; }
//     else { pubmedChecked = 'checked'; }
  let createActionTogglerSelected = 'alliance';
  if (createAction === 'pubmed') {
      radioFormPubmedClassname += ' underlined';
      pubmedChecked = 'checked';
      createActionTogglerSelected = 'pubmed'; }
    else {
      radioFormAllianceClassname += ' underlined';
      allianceChecked = 'checked'; }
  let newUrl = "/Create/?action=" + createActionTogglerSelected
  window.history.replaceState({}, null, newUrl)

  return (
    <Form>
    <div key={`default-radio`} className="mb-3">
      <div className='radio-span'>
        <Form.Check
          inline
          className={radioFormPubmedClassname}
          checked={pubmedChecked}
          type='radio'
          label='PubMed'
          id='create-toggler-pubmed'
          onChange={(e) => dispatch(changeCreateActionToggler(e))}
        />
      </div>
      <div className='radio-span'>
        <Form.Check
          inline
          className={radioFormAllianceClassname}
          checked={allianceChecked}
          type='radio'
          label='Alliance'
          id='create-toggler-alliance'
          onChange={(e) => dispatch(changeCreateActionToggler(e))}
        />
      </div>
    </div>
    </Form>);
} // const CreateActionToggler

const CreateActionRouter = () => {
  const dispatch = useDispatch();
  const createAction = useSelector(state => state.create.createAction);
  const accessLevel = useGetAccessLevel();
  const useQuery = () => { return new URLSearchParams(useLocation().search); }
  let query = useQuery();
  if (createAction === '') {
    let paramAction = query.get('action');
    dispatch(setCreateActionToggler(paramAction));
  }

  useEffect( () => {
    if (enumDict['mods'].includes(accessLevel)) {
      const modPrefix = (accessLevel === 'XB') ? 'Xenbase' : accessLevel;
      dispatch(changeCreateField({target: {id: 'modPrefix', value: modPrefix }})); }
  }, [accessLevel]); // eslint-disable-line react-hooks/exhaustive-deps

  switch (createAction) {
    case 'alliance':
      return (<Container><CreateActionToggler /><RowDivider /><CreateAlliance /></Container>);
    case 'pubmed':
      return (<Container><CreateActionToggler /><RowDivider /><CreatePubmed /></Container>);
    default:
      return (<Container><CreateActionToggler /><RowDivider /><CreateAlliance /></Container>);
  }
}

const RowDivider = () => { return (<Row><Col>&nbsp;</Col></Row>); }

const PERSON_XREF_PREFIXES = ['ORCID', 'WB', 'ZFIN', 'XenBase'];
const PERSON_STATUS_OPTIONS = ['active', 'retired', 'deceased'];
const MockupCreatePersonTitle = 'Mockup only — not wired to the API';

const classifyPersonInput = (raw) => {
  const trimmed = (raw || '').trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('AGRKB:')) {
    return { endpoint: '/person/' + trimmed };
  }
  if (PERSON_XREF_PREFIXES.some((p) => trimmed.startsWith(p + ':'))) {
    return { endpoint: '/person/by_person_cross_reference/' + trimmed };
  }
  if (trimmed.includes('@')) {
    return { endpoint: '/person/by_email/' + encodeURIComponent(trimmed) };
  }
  return { endpoint: '/person/by_name?name=' + encodeURIComponent(trimmed) };
};

const CreatePerson = () => {
  const [inputValue, setInputValue] = useState('');
  const [matches, setMatches] = useState(null);
  const [searchError, setSearchError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [displayName, setDisplayName] = useState('');
  const [status, setStatus] = useState('active');
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');

  const handleQuery = async () => {
    const classified = classifyPersonInput(inputValue);
    if (!classified) return;
    setIsLoading(true);
    setSearchError('');
    setMatches(null);
    setHasSearched(false);
    try {
      const res = await api.get(classified.endpoint);
      let list = [];
      if (Array.isArray(res.data)) {
        list = res.data;
      } else if (res.data && typeof res.data === 'object' && (res.data.curie || res.data.person_id)) {
        list = [res.data];
      }
      setMatches(list);
      setHasSearched(true);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      const status404 = err?.response?.status === 404;
      if (status404) {
        setMatches([]);
        setHasSearched(true);
      } else {
        setSearchError(typeof detail === 'string' ? detail : 'An unexpected error occurred.');
        setHasSearched(true);
        setMatches([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const generalClassName = 'Col-general';

  return (
    <Container>
      <Form.Group as={Row} key="PersonLookup" >
        {/* Empty column to align the input/button with the Resource and Lab
            sections, which have a lookup-field dropdown here. */}
        <Form.Label column sm="2" className={`${generalClassName}`} ></Form.Label>
        <Col sm="6" className={`${generalClassName}`}>
          <Form.Control as="input" name="personLookupValue" id="personLookupValue" type="input"
            value={inputValue} className={`form-control`}
            placeholder="e.g., AGRKB:103000000000001, ORCID:0000-0001-2345-6789, WB:WBPerson12345, jane.doe@example.org, or Jane Doe"
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => { if (e.charCode === 13) handleQuery(); }} />
        </Col>
        <Col sm="4" className={`${generalClassName}`}>
          <Button id="button-query-person" variant="outline-secondary"
            disabled={isLoading}
            onClick={handleQuery} >
            {isLoading ? <Spinner animation="border" size="sm" /> : <span>Query Person</span>}
          </Button>
        </Col>
      </Form.Group>

      {searchError && (
        <Alert variant="danger" onClose={() => setSearchError('')} dismissible>
          {searchError}
        </Alert>
      )}

      {hasSearched && matches && matches.length > 0 && (
        <div style={{ marginBottom: '1em' }}>
          <strong>{matches.length} existing match{matches.length > 1 ? 'es' : ''} found:</strong>
          <ul style={{ listStyle: 'none', paddingLeft: 0, marginTop: 4 }}>
            {matches.map((m, i) => (
              <li key={m.curie ?? m.person_id ?? i} style={{ padding: '4px 0' }}>
                <Link to={`/person?personCurie=${encodeURIComponent(m.curie ?? '')}`}>
                  {m.display_name || '(no display name)'}
                </Link>
                <span style={{ color: '#888', marginLeft: 8, fontSize: '0.9em' }}>
                  {m.curie}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {hasSearched && matches && matches.length === 0 && !searchError && (
        <div style={{ marginBottom: '1em', color: '#888' }}>
          No existing person matches found.
        </div>
      )}

      {hasSearched && (
        <Form>
          <p style={{ marginTop: '0.5em' }}>
            If you've checked that the person you're looking for does not exist, fill out the fields below to create.
          </p>
          <Form.Group as={Row} key="newPersonDisplayName">
            <Form.Label column sm="2">display_name</Form.Label>
            <Col sm="6">
              <Form.Control
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </Col>
          </Form.Group>
          <Form.Group as={Row} key="newPersonStatus">
            <Form.Label column sm="2">status</Form.Label>
            <Col sm="3">
              <Form.Control
                as="select"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {PERSON_STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Form.Control>
            </Col>
          </Form.Group>
          <Form.Group as={Row} key="newPersonName">
            <Form.Label column sm="2">name</Form.Label>
            <Col sm="3">
              <Form.Control
                placeholder="first_name"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </Col>
            <Col sm="3">
              <Form.Control
                placeholder="middle_name"
                type="text"
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
              />
            </Col>
            <Col sm="3">
              <Form.Control
                placeholder="last_name"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </Col>
          </Form.Group>
          <div style={{ marginTop: '1em' }}>
            <Button variant="primary" disabled title={MockupCreatePersonTitle}>
              Create (mockup)
            </Button>
            <span style={{ color: '#888', marginLeft: 12 }}>{MockupCreatePersonTitle}</span>
          </div>
        </Form>
      )}
    </Container>
  );
};

const LAB_LOOKUP_OPTIONS = [
  { value: 'name', label: 'Lab Name' },
  { value: 'strain_designation', label: 'Strain Designation' },
];

const CreateLab = () => {
  const history = useHistory();
  const accessLevel = useGetAccessLevel();
  const [lookupKey, setLookupKey] = useState('name');
  // Once the curator picks a lookup field themselves, stop auto-defaulting it.
  const lookupKeyTouched = useRef(false);
  const [lookupValue, setLookupValue] = useState('');
  const [matches, setMatches] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState('');

  const [createdMessage, setCreatedMessage] = useState('');
  const [createError, setCreateError] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const generalClassName = 'Col-general';

  // WormBase curators look labs up by strain designation by default. Only apply
  // this until the curator changes the dropdown themselves. accessLevel can
  // resolve after mount, so key the effect on it (as CreateActionRouter does).
  useEffect(() => {
    if (!lookupKeyTouched.current) {
      setLookupKey(accessLevel === 'WB' ? 'strain_designation' : 'name');
    }
  }, [accessLevel]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleQuery = async () => {
    const trimmed = lookupValue.trim();
    if (!trimmed) return;
    setIsLoading(true);
    setSearchError('');
    setMatches(null);
    setHasSearched(false);
    setCreatedMessage('');
    setCreateError('');
    try {
      // lookupKey ('name' | 'strain_designation') selects the matching endpoint.
      const res = await api.get('/laboratory/by_' + lookupKey + '?query=' + encodeURIComponent(trimmed));
      let list = [];
      if (Array.isArray(res.data)) {
        list = res.data;
      } else if (res.data && typeof res.data === 'object' && (res.data.curie || res.data.laboratory_id)) {
        list = [res.data];
      }
      setMatches(list);
      setHasSearched(true);
    } catch (err) {
      const status404 = err?.response?.status === 404;
      if (status404) {
        setMatches([]);
        setHasSearched(true);
      } else {
        const detail = err?.response?.data?.detail;
        setSearchError(typeof detail === 'string' ? detail : 'An unexpected error occurred.');
        setMatches([]);
        setHasSearched(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    setIsCreating(true);
    setCreateError('');
    setCreatedMessage('');
    // The lookup field the curator queried is what creates the lab.
    const body = { [lookupKey]: lookupValue.trim() };
    try {
      const res = await api.post('/laboratory/', body);
      const curie = (res.data && typeof res.data === 'object') ? (res.data.curie ?? '') : (res.data ?? '');
      const newCurie = typeof curie === 'string' ? curie : '';
      if (newCurie) {
        // Redirect to the newly-created lab on the Laboratory page.
        history.push('/lab?q=' + encodeURIComponent(newCurie));
        return;
      }
      // No curie came back — fall back to an on-page success message.
      setCreatedMessage('Laboratory created.');
      setMatches(null);
      setHasSearched(false);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setCreateError(typeof detail === 'string' ? detail : 'An unexpected error occurred.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Container>
    <Form.Group as={Row} key="LabLookup" >
      <Form.Label column sm="2" className={`${generalClassName}`} >
        <Form.Control as="select" value={lookupKey}
          onChange={(e) => { lookupKeyTouched.current = true; setLookupKey(e.target.value); }} >
          {LAB_LOOKUP_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </Form.Control>
      </Form.Label>
      <Col sm="6" className={`${generalClassName}`}>
        <Form.Control as="input" name="labLookupValue" id="labLookupValue" type="input"
          value={lookupValue} className={`form-control`}
          placeholder="Pick a lookup field and enter a value"
          onChange={(e) => setLookupValue(e.target.value)}
          onKeyPress={(e) => { if (e.charCode === 13) handleQuery(); }} />
      </Col>
      <Col sm="4" className={`${generalClassName}`}>
        <Button id="button-query-lab" variant="outline-secondary"
          disabled={isLoading}
          onClick={handleQuery} >
          {isLoading ? <Spinner animation="border" size="sm"/> : <span>Query Lab</span> }
        </Button>
      </Col>
    </Form.Group>

    {searchError && (
      <Alert variant="danger" onClose={() => setSearchError('')} dismissible>{searchError}</Alert>
    )}

    { matches && matches.length > 0 && (
      <Form.Group as={Row} key="LabExists" >
        <Form.Label column sm="2" className={`${generalClassName}`} >Existing Labs</Form.Label>
        <Col sm="10" className={`${generalClassName}`}>
          <ul style={{ listStyle: 'none', paddingLeft: 0, marginBottom: 0 }}>
            {matches.map((m, i) => {
              const label = [m.name, m.strain_designation].filter(Boolean).join(' · ');
              return (
                <li key={m.curie ?? m.laboratory_id ?? i} style={{ padding: '4px 0' }}>
                  <Link to={`/lab?q=${encodeURIComponent(m.curie ?? '')}`}>
                    {label || '(no name)'}
                  </Link>
                  <span style={{ color: '#888', marginLeft: 8, fontSize: '0.9em' }}>{m.curie}</span>
                </li>
              );
            })}
          </ul>
        </Col>
      </Form.Group>
    ) }

    { hasSearched && matches && matches.length === 0 && !searchError && (
      <>
        <div style={{ marginBottom: '1em', color: '#888' }}>
          No existing labs found for {LAB_LOOKUP_OPTIONS.find(o => o.value === lookupKey)?.label} "{lookupValue.trim()}".
        </div>
        <Button id="button-create-lab" variant="outline-secondary"
          disabled={isCreating || !lookupValue.trim()}
          onClick={handleCreate} >
          {isCreating ? <Spinner animation="border" size="sm"/> : <span>Create Lab</span> }
        </Button>
      </>
    ) }

    { createdMessage && (
      <Alert variant="success" className="mt-2">{createdMessage}</Alert>
    ) }
    { createError && (
      <Alert variant="danger" className="mt-2">{createError}</Alert>
    ) }
    </Container>);
} // const CreateLab


const Create = () => {
  const createRedirectToBiblio = useSelector(state => state.create.redirectToBiblio);
  const createRedirectCurie = useSelector(state => state.create.redirectCurie);
  const updateMessages = useSelector(state => state.create.updateMessages);
  const updateFailure = useSelector(state => state.create.updateFailure);
  const createModalText = useSelector(state => state.create.createModalText);
  const dispatch = useDispatch();
  const history = useHistory();

  function pushHistory(referenceCurie) {
    console.log('history push');
    dispatch(setBiblioAction('editor'));
    dispatch(resetCreateRedirect());
    dispatch(resetBiblioIsLoading());
    // dispatching these 2 actions and their reducers to alter the state from a different component creates a warning, but it's needed for Biblio to set the correct referenceCurie and query the db for its data.
    // Warning: Cannot update during an existing state transition (such as within `render`). Render methods should be a pure function of props and state.
    dispatch(setGetReferenceCurieFlag(true));
    dispatch(setReferenceCurie(referenceCurie));
    history.push("/Biblio/?action=editor&referenceCurie=" + referenceCurie);
  }

  useEffect(() => {
    if (createRedirectToBiblio) {
      pushHistory(createRedirectCurie);
    }
  }, [createRedirectToBiblio, createRedirectCurie, dispatch, history]); // Dependencies ensure this effect runs when these values change

  return (
    <div>
      <ModalGeneric showGenericModal={createModalText !== '' ? true : false} genericModalHeader="Create reference Error"
                    genericModalBody={createModalText} onHideAction={setCreateModalText('')} />
      <h4>Create a new Reference</h4>
      <p>Create a new reference from PubMed PMID or manually</p>
      { updateFailure > 0 && 
        updateMessages.map((message, index) => (
          <div key={`message ${index}`}><span style={{color:'red'}}>{message}</span></div> ))
      }
      <CreateActionRouter />
      {process.env.REACT_APP_DEV_OR_STAGE_OR_PROD !== 'prod' && (
        <>
          <hr style={{marginTop: '2em', marginBottom: '2em'}} />
          <h4>Create a new Person</h4>
          <p>Create a new Person manually after checking it does not exist.</p>
          <CreatePerson />
        </>
      )}
      <hr style={{marginTop: '2em', marginBottom: '2em'}} />
      <h4>Create a new Lab</h4>
      <p>Look up a lab by name or strain designation, then create it if none exists.</p>
      <CreateLab />
      <hr style={{marginTop: '2em', marginBottom: '2em'}} />
      <h4>Create a new Resource</h4>
      <p>Create a new resource from NLM or ISSN curie</p>
      <CreateResource />
    </div>
  )
}

export default Create
