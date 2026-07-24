import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useLocation, useHistory } from 'react-router-dom';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Alert from 'react-bootstrap/Alert';
import Tabs from 'react-bootstrap/Tabs';
import Tab from 'react-bootstrap/Tab';

import { api } from '../api';
import LaboratoryEditor from './laboratory/LaboratoryEditor';
import LaboratoryDisplay from './laboratory/LaboratoryDisplay';
import LaboratoryWbDisplay from './laboratory/LaboratoryWbDisplay';

const VALID_TABS = ['editor', 'ccdisplay', 'wbdisplay'];
const DEFAULT_TAB = 'editor';

const LAB_LOOKUP_OPTIONS = [
  { value: 'name', label: 'Lab Name' },
  { value: 'strain_designation', label: 'Strain Designation' },
];

// Route a single free-text input to the right endpoint by its shape:
//   - a laboratory curie (AGRKB:704…) or a bare numeric id  → fetch one lab
//   - any other PREFIX:ID                                    → laboratory_cross_reference lookup
//   - otherwise → the endpoint chosen by the lookup dropdown (by_name or by_strain_designation)
const classifyInput = (raw, lookupKey) => {
  const trimmed = (raw || '').trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('AGRKB:') || /^\d+$/.test(trimmed)) {
    return { endpoint: '/laboratory/' + trimmed };
  }
  if (trimmed.includes(':')) {
    return { endpoint: '/laboratory/by_laboratory_cross_reference/' + trimmed };
  }
  return {
    endpoint: '/laboratory/by_' + lookupKey + '?query=' + encodeURIComponent(trimmed),
    field: lookupKey,
  };
};

const buildSearch = (value, tab, field) => {
  const params = new URLSearchParams();
  params.set('q', value);
  if (tab && tab !== DEFAULT_TAB) params.set('tab', tab);
  // Only free-text (name/strain) lookups carry the field; curie/xref omit it.
  if (field) params.set('field', field);
  return '?' + params.toString();
};

const Laboratory = () => {
  const location = useLocation();
  const history = useHistory();

  const cognitoMod = useSelector((state) => state.isLogged.cognitoMod);
  const testerMod = useSelector((state) => state.isLogged.testerMod);
  const accessLevel = testerMod !== 'No' ? testerMod : cognitoMod;

  // Lookup field for free-text queries. An explicit ?field= in the URL wins;
  // otherwise WormBase curators default to strain designation, everyone else to
  // lab name. Initialized synchronously so the mount-time URL-sync auto-load uses
  // the right field on first render.
  // Mount-only: consumed solely by the useState/useRef initializers below (which
  // read it once). Later URL changes are reflected into lookupKey by the sync
  // effect further down — this does NOT keep lookupKey in step on its own.
  const urlField = (() => {
    const f = new URLSearchParams(location.search).get('field');
    return f === 'name' || f === 'strain_designation' ? f : null;
  })();
  const [lookupKey, setLookupKey] = useState(urlField || (accessLevel === 'WB' ? 'strain_designation' : 'name'));
  // A URL-supplied field (or a manual dropdown change) is an explicit choice that
  // freezes the MOD default.
  const lookupKeyTouched = useRef(!!urlField);
  useEffect(() => {
    if (!lookupKeyTouched.current) {
      setLookupKey(accessLevel === 'WB' ? 'strain_designation' : 'name');
    }
  }, [accessLevel]);

  const generalClassName = 'Col-general';

  const [inputValue, setInputValue] = useState('');
  const [laboratoryData, setLaboratoryData] = useState(null);
  const [matches, setMatches] = useState(null);
  const [activeTab, setActiveTab] = useState(DEFAULT_TAB);
  const [error, setError] = useState('');
  const [showAlert, setShowAlert] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // The query currently reflected in the URL, so URL syncs don't refetch needlessly.
  const currentQueryRef = useRef(null);
  // The lookup field reflected in the URL for the current query (null for curie/xref).
  const currentFieldRef = useRef(null);

  const runQuery = useCallback(async (rawValue, tabForUrl, fieldOverride, replaceHistory = false) => {
    // fieldOverride lets the URL-sync path force the field before lookupKey state
    // has settled; otherwise use the current dropdown selection. replaceHistory is
    // set when the query originates from the URL (deep-link / Back / forward) so
    // normalizing a field-less URL to include ?field= replaces the entry instead
    // of pushing a new one — otherwise Back would re-trigger this and re-push,
    // trapping the browser Back button.
    const classified = classifyInput(rawValue, fieldOverride || lookupKey);
    if (!classified) return;
    setIsLoading(true);
    setShowAlert(false);
    setError('');
    try {
      const res = await api.get(classified.endpoint);

      // Normalize to either a single record, a multi-match list, or empty.
      let record = null;
      let multi = null;
      if (Array.isArray(res.data)) {
        if (res.data.length === 1) record = res.data[0];
        else if (res.data.length > 1) multi = res.data;
      } else if (res.data && typeof res.data === 'object' && (res.data.curie || res.data.laboratory_id)) {
        record = res.data;
      }

      if (!record && !multi) {
        setLaboratoryData(null);
        setMatches(null);
        setError('Laboratory not found');
        setShowAlert(true);
        currentQueryRef.current = null;
        currentFieldRef.current = null;
        return;
      }

      if (multi) {
        setLaboratoryData(null);
        setMatches(multi);
      } else {
        setLaboratoryData(record);
        setMatches(null);
      }
      currentQueryRef.current = rawValue.trim();
      currentFieldRef.current = classified.field ?? null;

      const desiredSearch = buildSearch(rawValue.trim(), tabForUrl ?? activeTab, classified.field);
      if (location.search !== desiredSearch) {
        history[replaceHistory ? 'replace' : 'push']({ pathname: '/lab', search: desiredSearch });
      }
    } catch (err) {
      setLaboratoryData(null);
      setMatches(null);
      currentQueryRef.current = null;
      currentFieldRef.current = null;
      const detail = err?.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'An unexpected error occurred.');
      setShowAlert(true);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, history, location.search, lookupKey]);

  // Sync from the ?q=/?tab= URL params on mount and when they change externally.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get('q');
    const tab = params.get('tab');
    const fieldParam = params.get('field');
    const validField = fieldParam === 'name' || fieldParam === 'strain_designation' ? fieldParam : null;

    if (tab && VALID_TABS.includes(tab) && tab !== activeTab) {
      setActiveTab(tab);
    }
    if (validField && validField !== lookupKey) {
      setLookupKey(validField);
      lookupKeyTouched.current = true;
    }

    if (!q) {
      currentQueryRef.current = null;
      currentFieldRef.current = null;
      return;
    }
    if (currentQueryRef.current === q && currentFieldRef.current === validField) return;
    setInputValue(q);
    runQuery(q, tab && VALID_TABS.includes(tab) ? tab : activeTab, validField, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  const handleSubmit = () => runQuery(inputValue, activeTab);

  const handleSelectMatch = (curie) => {
    if (!curie) return;
    setInputValue(curie);
    runQuery(curie, activeTab);
  };

  const handleTabSelect = (key) => {
    if (!key || !VALID_TABS.includes(key)) return;
    setActiveTab(key);
    const q = currentQueryRef.current;
    if (q) {
      const newSearch = buildSearch(q, key, currentFieldRef.current);
      if (location.search !== newSearch) {
        history.replace({ pathname: '/lab', search: newSearch });
      }
    }
  };

  return (
    <Container fluid>
      <Row>
        <Col>
          <h3 style={{ textAlign: 'center' }}>Laboratory</h3>

          {showAlert && (
            <Alert variant="danger" onClose={() => setShowAlert(false)} dismissible>
              {error}
            </Alert>
          )}
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
                  value={inputValue} className={`form-control`}
                  placeholder="Pick a lookup field and enter a value"
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={(e) => { if (e.charCode === 13) handleSubmit(); }} />
              </Col>
              <Col sm="4" className={`${generalClassName}`}>
                <Button onClick={handleSubmit} disabled={isLoading}>
                  {isLoading ? 'Loading…' : 'Query Laboratory'}
                </Button>
              </Col>
            </Form.Group>
          </Container>

          {matches && matches.length > 1 && !laboratoryData && (
            <div style={{ maxWidth: '40em', margin: '0 auto' }}>
              <div style={{ marginBottom: 8 }}>
                <strong>{matches.length} matches found</strong>
                <span style={{ color: '#888' }}> — pick one to load:</span>
              </div>
              <ul style={{ listStyle: 'none', paddingLeft: 0, marginBottom: 0 }}>
                {matches.map((m, i) => {
                  const label = [m.name, m.strain_designation].filter(Boolean).join(' · ');
                  return (
                    <li
                      key={m.curie ?? m.laboratory_id ?? i}
                      style={{ padding: '8px 12px', borderBottom: '1px solid #eee', cursor: 'pointer' }}
                    >
                      <a
                        href={'/lab?q=' + encodeURIComponent(m.curie ?? '')}
                        onClick={(e) => {
                          e.preventDefault();
                          handleSelectMatch(m.curie);
                        }}
                      >
                        {label || '(no name)'}
                      </a>
                      <span style={{ color: '#888', marginLeft: 8, fontSize: '0.9em' }}>{m.curie}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {laboratoryData && (
            <Tabs
              activeKey={activeTab}
              onSelect={handleTabSelect}
              id="laboratory-view-tabs"
              className="mb-3"
            >
              <Tab eventKey="editor" title="Editor">
                {activeTab === 'editor' && (
                  <LaboratoryEditor key={laboratoryData.curie} laboratory={laboratoryData} />
                )}
              </Tab>
              <Tab eventKey="ccdisplay" title="CC Display">
                {activeTab === 'ccdisplay' && <LaboratoryDisplay laboratory={laboratoryData} />}
              </Tab>
              <Tab eventKey="wbdisplay" title="WB display">
                {activeTab === 'wbdisplay' && <LaboratoryWbDisplay laboratory={laboratoryData} />}
              </Tab>
            </Tabs>
          )}
        </Col>
      </Row>
    </Container>
  );
};

export default Laboratory;
