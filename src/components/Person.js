import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import InputGroup from 'react-bootstrap/InputGroup';
import Alert from 'react-bootstrap/Alert';
import Tabs from 'react-bootstrap/Tabs';
import Tab from 'react-bootstrap/Tab';

import { api } from '../api';
import PersonCcDisplay from './person/PersonCcDisplay';
import PersonEditor from './person/PersonEditor';
import PersonJson from './person/PersonJson';
import PersonCompact from './person/PersonCompact';
import PersonTree from './person/PersonTree';
import PersonWbDisplay from './person/PersonWbDisplay';
import PersonWbEditor from './person/PersonWbEditor';

const VALID_TABS = ['ccdisplay', 'editor', 'json', 'compact', 'tree', 'wbdisplay', 'wbeditor'];
const DEFAULT_TAB = 'ccdisplay';

const XREF_PREFIXES = ['ORCID', 'WB', 'ZFIN', 'XenBase'];

const classifyInput = (raw) => {
  const trimmed = (raw || '').trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('AGRKB:') || trimmed.startsWith('AGR:')) {
    // Match the Biblio "Query exact ID" convention: do not encode curies (colon must stay literal).
    return { kind: 'curie', value: trimmed, urlParam: 'personCurie', endpoint: '/person/' + trimmed };
  }
  if (XREF_PREFIXES.some((p) => trimmed.startsWith(p + ':'))) {
    return {
      kind: 'xref',
      value: trimmed,
      urlParam: 'personXref',
      endpoint: '/person/by_person_cross_reference/' + trimmed,
    };
  }
  if (trimmed.includes('@')) {
    return { kind: 'email', value: trimmed, urlParam: 'personEmail', endpoint: '/person/by_email/' + encodeURIComponent(trimmed) };
  }
  // Name uses ?name= query param (not a path segment) per backend convention
  return { kind: 'name', value: trimmed, urlParam: 'personName', endpoint: '/person/by_name?name=' + encodeURIComponent(trimmed) };
};

const buildSearch = (urlParam, value, tab) => {
  const params = new URLSearchParams();
  params.set(urlParam, value);
  if (tab && tab !== DEFAULT_TAB) params.set('tab', tab);
  return '?' + params.toString();
};

const Person = () => {
  const location = useLocation();
  const history = useHistory();

  const [inputValue, setInputValue] = useState('');
  const [personData, setPersonData] = useState(null);
  const [matches, setMatches] = useState(null);
  const [activeTab, setActiveTab] = useState(DEFAULT_TAB);
  const [error, setError] = useState('');
  const [showAlert, setShowAlert] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Track the lookup currently reflected in the URL so tab changes can replace correctly
  const currentLookupRef = useRef(null); // { urlParam, value }

  const runQuery = useCallback(async (classified, tabForUrl) => {
    setIsLoading(true);
    setShowAlert(false);
    setError('');
    try {
      const res = await api.get(classified.endpoint);

      // Normalize to either a single record, a multi-match list, or empty.
      let record = null;
      let multi = null;
      if (Array.isArray(res.data)) {
        if (res.data.length === 0) {
          // empty list → not found
        } else if (res.data.length === 1) {
          record = res.data[0];
        } else {
          multi = res.data;
        }
      } else if (res.data && typeof res.data === 'object' && (res.data.curie || res.data.person_id)) {
        record = res.data;
      }

      if (!record && !multi) {
        setPersonData(null);
        setMatches(null);
        setError('Person not found');
        setShowAlert(true);
        currentLookupRef.current = null;
        return;
      }

      if (multi) {
        setPersonData(null);
        setMatches(multi);
      } else {
        setPersonData(record);
        setMatches(null);
      }
      currentLookupRef.current = { urlParam: classified.urlParam, value: classified.value };

      const desiredSearch = buildSearch(classified.urlParam, classified.value, tabForUrl ?? activeTab);
      if (location.search !== desiredSearch) {
        history.push({ pathname: '/person', search: desiredSearch });
      }
    } catch (err) {
      setPersonData(null);
      setMatches(null);
      currentLookupRef.current = null;
      const detail = err?.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'An unexpected error occurred.');
      setShowAlert(true);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, history, location.search]);

  // Sync from URL on mount and whenever ?personCurie/personXref/personEmail/personName changes externally
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const curie = params.get('personCurie');
    const xref = params.get('personXref');
    const email = params.get('personEmail');
    const name = params.get('personName');
    const tab = params.get('tab');

    if (tab && VALID_TABS.includes(tab) && tab !== activeTab) {
      setActiveTab(tab);
    }

    const lookup = curie ? { urlParam: 'personCurie', value: curie }
      : xref ? { urlParam: 'personXref', value: xref }
      : email ? { urlParam: 'personEmail', value: email }
      : name ? { urlParam: 'personName', value: name }
      : null;

    if (!lookup) {
      currentLookupRef.current = null;
      return;
    }

    const already = currentLookupRef.current;
    if (already && already.urlParam === lookup.urlParam && already.value === lookup.value) {
      // URL already reflects loaded record; skip refetch
      return;
    }

    setInputValue(lookup.value);
    const classified = classifyInput(lookup.value);
    if (classified) {
      runQuery(classified, tab && VALID_TABS.includes(tab) ? tab : activeTab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  const handleSubmit = () => {
    const classified = classifyInput(inputValue);
    if (!classified) return;
    runQuery(classified, activeTab);
  };

  const handleSelectMatch = (curie) => {
    if (!curie) return;
    setInputValue(curie);
    const classified = classifyInput(curie);
    if (classified) runQuery(classified, activeTab);
  };

  const handleTabSelect = (key) => {
    if (!key || !VALID_TABS.includes(key)) return;
    setActiveTab(key);
    const lookup = currentLookupRef.current;
    if (lookup) {
      const newSearch = buildSearch(lookup.urlParam, lookup.value, key);
      if (location.search !== newSearch) {
        history.replace({ pathname: '/person', search: newSearch });
      }
    }
  };

  return (
    <Container fluid>
      <Row>
        <Col>
          <h3 style={{ textAlign: 'center' }}>Person</h3>

          <div style={{ maxWidth: '40em', margin: '0 auto 16px' }}>
            {showAlert && (
              <Alert variant="danger" onClose={() => setShowAlert(false)} dismissible>
                {error}
              </Alert>
            )}
            <InputGroup>
              <Form.Control
                placeholder="e.g., AGRKB:103000000000001, ORCID:0000-0001-2345-6789, WB:WBPerson12345, jane.doe@example.org, or Jane Doe"
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => {
                  if (e.charCode === 13) handleSubmit();
                }}
              />
              <Button onClick={handleSubmit} disabled={isLoading}>
                {isLoading ? 'Loading…' : 'Query Person'}
              </Button>
            </InputGroup>
          </div>

          {matches && matches.length > 1 && !personData && (
            <div style={{ maxWidth: '40em', margin: '0 auto' }}>
              <div style={{ marginBottom: 8 }}>
                <strong>{matches.length} matches found</strong>
                <span style={{ color: '#888' }}> — pick one to load:</span>
              </div>
              <ul style={{ listStyle: 'none', paddingLeft: 0, marginBottom: 0 }}>
                {matches.map((m, i) => (
                  <li
                    key={m.curie ?? m.person_id ?? i}
                    style={{
                      padding: '8px 12px',
                      borderBottom: '1px solid #eee',
                      cursor: 'pointer',
                    }}
                  >
                    <a
                      href={'/person?personCurie=' + encodeURIComponent(m.curie ?? '')}
                      onClick={(e) => {
                        e.preventDefault();
                        handleSelectMatch(m.curie);
                      }}
                    >
                      {m.display_name || '(no display name)'}
                    </a>
                    <span style={{ color: '#888', marginLeft: 8, fontSize: '0.9em' }}>
                      {m.curie}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {personData && (
            <>
              <h5 style={{ textAlign: 'center', marginBottom: 8 }}>
                Person: {personData.display_name || '(no name)'} ({personData.curie})
              </h5>

              <Tabs
                activeKey={activeTab}
                onSelect={handleTabSelect}
                id="person-view-tabs"
                className="mb-3"
              >
                <Tab eventKey="ccdisplay" title="CC Display">
                  {activeTab === 'ccdisplay' && <PersonCcDisplay person={personData} />}
                </Tab>
                <Tab eventKey="editor" title="Editor">
                  {activeTab === 'editor' && <PersonEditor person={personData} />}
                </Tab>
                <Tab eventKey="json" title="JSON">
                  {activeTab === 'json' && <PersonJson person={personData} />}
                </Tab>
                <Tab eventKey="compact" title="Compact">
                  {activeTab === 'compact' && <PersonCompact person={personData} />}
                </Tab>
                <Tab eventKey="tree" title="Tree">
                  {activeTab === 'tree' && <PersonTree person={personData} />}
                </Tab>
                <Tab eventKey="wbdisplay" title="WB display">
                  {activeTab === 'wbdisplay' && <PersonWbDisplay person={personData} />}
                </Tab>
                <Tab eventKey="wbeditor" title="WB editor">
                  {activeTab === 'wbeditor' && (
                    <PersonWbEditor key={personData.curie} person={personData} />
                  )}
                </Tab>
              </Tabs>
            </>
          )}
        </Col>
      </Row>
    </Container>
  );
};

export default Person;
