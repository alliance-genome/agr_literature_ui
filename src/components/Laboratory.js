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
import LaboratoryDisplay from './laboratory/LaboratoryDisplay';
import LaboratoryWbDisplay from './laboratory/LaboratoryWbDisplay';

const VALID_TABS = ['ccdisplay', 'wbdisplay'];
const DEFAULT_TAB = 'ccdisplay';

// Route a single free-text input to the right endpoint by its shape:
//   - a laboratory curie (AGRKB:704…) or a bare numeric id  → fetch one lab
//   - any other PREFIX:ID                                    → laboratory_cross_reference lookup
//   - otherwise (name or strain designation)                → server-side name/strain search
const classifyInput = (raw) => {
  const trimmed = (raw || '').trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('AGRKB:') || /^\d+$/.test(trimmed)) {
    return { endpoint: '/laboratory/' + trimmed };
  }
  if (trimmed.includes(':')) {
    return { endpoint: '/laboratory/by_laboratory_cross_reference/' + trimmed };
  }
  return {
    endpoint: '/laboratory/by_name_or_strain_designation?query=' + encodeURIComponent(trimmed),
  };
};

const buildSearch = (value, tab) => {
  const params = new URLSearchParams();
  params.set('q', value);
  if (tab && tab !== DEFAULT_TAB) params.set('tab', tab);
  return '?' + params.toString();
};

const Laboratory = () => {
  const location = useLocation();
  const history = useHistory();

  const [inputValue, setInputValue] = useState('');
  const [laboratoryData, setLaboratoryData] = useState(null);
  const [matches, setMatches] = useState(null);
  const [activeTab, setActiveTab] = useState(DEFAULT_TAB);
  const [error, setError] = useState('');
  const [showAlert, setShowAlert] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // The query currently reflected in the URL, so URL syncs don't refetch needlessly.
  const currentQueryRef = useRef(null);

  const runQuery = useCallback(async (rawValue, tabForUrl) => {
    const classified = classifyInput(rawValue);
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

      const desiredSearch = buildSearch(rawValue.trim(), tabForUrl ?? activeTab);
      if (location.search !== desiredSearch) {
        history.push({ pathname: '/lab', search: desiredSearch });
      }
    } catch (err) {
      setLaboratoryData(null);
      setMatches(null);
      currentQueryRef.current = null;
      const detail = err?.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'An unexpected error occurred.');
      setShowAlert(true);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, history, location.search]);

  // Sync from the ?q=/?tab= URL params on mount and when they change externally.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get('q');
    const tab = params.get('tab');

    if (tab && VALID_TABS.includes(tab) && tab !== activeTab) {
      setActiveTab(tab);
    }

    if (!q) {
      currentQueryRef.current = null;
      return;
    }
    if (currentQueryRef.current === q) return;
    setInputValue(q);
    runQuery(q, tab && VALID_TABS.includes(tab) ? tab : activeTab);
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
      const newSearch = buildSearch(q, key);
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

          <div style={{ maxWidth: '40em', margin: '0 auto 16px' }}>
            {showAlert && (
              <Alert variant="danger" onClose={() => setShowAlert(false)} dismissible>
                {error}
              </Alert>
            )}
            <InputGroup>
              <Form.Control
                placeholder="e.g., AGRKB:704000000000001, WB:WBlab0001, a lab name, or a strain designation"
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => {
                  if (e.charCode === 13) handleSubmit();
                }}
              />
              <Button onClick={handleSubmit} disabled={isLoading}>
                {isLoading ? 'Loading…' : 'Query Laboratory'}
              </Button>
            </InputGroup>
          </div>

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
