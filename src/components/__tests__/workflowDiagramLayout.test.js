import { computeLayout, computeProcessRows, renderDiagram } from '../workflowDiagramLayout';

// A small FB-like MOD: corpus entry starts file upload, which hands off to text
// conversion, which hands off to curation classification (research articles only).
// Manual indexing has no automatic start.
const state = (tag, name, process, processName, transitions = []) => ({
  tag, tag_name: name, workflow_process: process, workflow_process_name: processName, transitions,
});
const TAG_DATA = [
  state('ATP:0000141', 'file needed', 'ATP:0000140', 'file upload',
    [{ to: 'ATP:0000134', to_name: 'files uploaded', transition_type: 'manual' }]),
  state('ATP:0000134', 'files uploaded', 'ATP:0000140', 'file upload',
    [{ to: 'ATP:0000162', to_name: 'text conversion needed', transition_type: 'automated' }]),
  state('ATP:0000162', 'text conversion needed', 'ATP:0000161', 'text conversion',
    [{ to: 'ATP:0000163', to_name: 'file converted to text', transition_type: 'automated' }]),
  state('ATP:0000163', 'file converted to text', 'ATP:0000161', 'text conversion'),
  state('ATP:0000313', 'curation classification needed', 'ATP:0000311', 'curation classification',
    [{ to: 'ATP:0000312', to_name: 'curation classification complete', transition_type: 'automated' }]),
  state('ATP:0000312', 'curation classification complete', 'ATP:0000311', 'curation classification'),
  state('ATP:0000274', 'manual indexing needed', 'ATP:0000273', 'manual indexing',
    [{ to: 'ATP:0000275', to_name: 'manual indexing complete', transition_type: 'manual' }]),
  state('ATP:0000275', 'manual indexing complete', 'ATP:0000273', 'manual indexing'),
];
const TRIGGERS = {
  entry_points: [{
    source: 'corpus_entry', source_label: 'Paper enters corpus',
    to_state: 'ATP:0000141', to_state_name: 'file needed',
    to_process: 'ATP:0000140', to_process_name: 'file upload', condition: null,
  }],
  handoffs: [
    { from_state: 'ATP:0000134', from_state_name: 'files uploaded', from_process: 'ATP:0000140',
      from_process_name: 'file upload', to_state: 'ATP:0000162', to_state_name: 'text conversion needed',
      to_process: 'ATP:0000161', to_process_name: 'text conversion', condition: 'research articles' },
    { from_state: 'ATP:0000163', from_state_name: 'file converted to text', from_process: 'ATP:0000161',
      from_process_name: 'text conversion', to_state: 'ATP:0000311', to_state_name: 'curation classification',
      to_process: 'ATP:0000311', to_process_name: 'curation classification', condition: 'research articles' },
    // a workflow this MOD has no transitions for is left out
    { from_state: 'ATP:0000312', from_state_name: 'curation classification complete', from_process: 'ATP:0000311',
      from_process_name: 'curation classification', to_state: 'ATP:0000371', to_state_name: 'first pass curation TBD',
      to_process: 'ATP:0000329', to_process_name: 'first pass curation', condition: 'once all three are complete' },
  ],
};
const ALL = new Set(['ATP:0000140', 'ATP:0000161', 'ATP:0000311', 'ATP:0000273']);

const groupsOf = (tagData) => {
  const groups = new Map();
  for (const n of tagData) groups.set(n.workflow_process, { processName: n.workflow_process_name });
  return groups;
};

describe('computeProcessRows', () => {
  test('rows follow what starts each workflow; unstarted workflows get their own lane', () => {
    const { rows, unstartedRows } = computeProcessRows(groupsOf(TAG_DATA), TRIGGERS);
    expect(rows).toEqual([['ATP:0000140'], ['ATP:0000161'], ['ATP:0000311']]);
    expect(unstartedRows).toEqual([['ATP:0000273']]);
  });

  test('the longest chain decides the row, and a cycle does not loop', () => {
    const groups = groupsOf(TAG_DATA);
    const triggers = {
      entry_points: [
        { source: 'corpus_entry', to_process: 'ATP:0000140' },
        { source: 'corpus_entry', to_process: 'ATP:0000311' },
      ],
      handoffs: [
        { from_process: 'ATP:0000140', to_process: 'ATP:0000161' },
        { from_process: 'ATP:0000161', to_process: 'ATP:0000311' },
        { from_process: 'ATP:0000311', to_process: 'ATP:0000161' },
      ],
    };
    const { rows, unstartedRows } = computeProcessRows(groups, triggers);
    expect(rows.flat()).toEqual(expect.arrayContaining(['ATP:0000140', 'ATP:0000161', 'ATP:0000311']));
    expect(rows[0]).toContain('ATP:0000140');
    // text conversion follows file upload, not the row file upload is in
    expect(rows.findIndex(r => r.includes('ATP:0000161'))).toBeGreaterThan(0);
    expect(unstartedRows.flat()).toEqual(['ATP:0000273']);
  });

  test('without trigger data every workflow is unstarted, in the usual order', () => {
    const { rows, unstartedRows } = computeProcessRows(groupsOf(TAG_DATA), null);
    expect(rows).toEqual([]);
    expect(unstartedRows[0][0]).toBe('ATP:0000140');
  });
});

describe('computeLayout with triggers', () => {
  const layout = computeLayout(TAG_DATA, ALL, new Set(), 1200, 800, { triggers: TRIGGERS });

  test('a start node sits above the workflows it starts', () => {
    const start = layout.nodes.find(n => n.type === 'start');
    const fileUpload = layout.nodes.find(n => n.id === 'summary:ATP:0000140');
    expect(start.name).toBe('Paper enters corpus');
    expect(start.y).toBeLessThan(fileUpload.y);
    expect(layout.edges.some(e => e.source === start.id && e.target === fileUpload.id && e.edgeType === 'start'))
      .toBe(true);
  });

  test('handoffs are drawn from the data, with their condition as a label', () => {
    const handoff = layout.edges.find(e => e.source === 'summary:ATP:0000161' && e.target === 'summary:ATP:0000311');
    expect(handoff.label).toBe('research articles');
    expect(handoff.edgeType).toBe('external');
    // the raw files uploaded -> text conversion needed transition is the handoff, drawn once
    expect(layout.edges.filter(e => e.source === 'summary:ATP:0000140' && e.target === 'summary:ATP:0000161'))
      .toHaveLength(1);
  });

  test('manual indexing is in the lane for workflows nothing starts', () => {
    expect(layout.lanes).toHaveLength(1);
    const manualIndexing = layout.nodes.find(n => n.id === 'summary:ATP:0000273');
    const curation = layout.nodes.find(n => n.id === 'summary:ATP:0000311');
    expect(layout.lanes[0].y).toBeGreaterThan(curation.y);
    expect(manualIndexing.y).toBeGreaterThan(layout.lanes[0].y);
  });

  test('without triggers there are no start nodes or lane', () => {
    const plain = computeLayout(TAG_DATA, ALL, new Set(), 1200, 800, {});
    expect(plain.nodes.some(n => n.type === 'start')).toBe(false);
    expect(plain.lanes).toEqual([]);
  });

  test('an expanded workflow connects the real states', () => {
    const expanded = computeLayout(TAG_DATA, new Set(['ATP:0000140', 'ATP:0000311', 'ATP:0000273']),
      new Set(), 1200, 800, { triggers: TRIGGERS });
    expect(expanded.edges.some(e => e.source === 'summary:ATP:0000140' && e.target === 'ATP:0000162')).toBe(true);
  });

  describe('a handoff replaces only the raw transition in its own direction', () => {
    // text conversion -> curation classification is a handoff; add raw transitions
    // between the same two boxes: a reset back the other way, and optionally a
    // second forward one so the raw edge is bidirectional
    const withRaw = (extraForward) => TAG_DATA.map((n) => {
      if (n.tag === 'ATP:0000313') {
        return { ...n, transitions: [...n.transitions,
          { to: 'ATP:0000162', to_name: 'text conversion needed', transition_type: 'reset' }] };
      }
      if (extraForward && n.tag === 'ATP:0000162') {
        return { ...n, transitions: [...n.transitions,
          { to: 'ATP:0000313', to_name: 'curation classification needed', transition_type: 'manual' }] };
      }
      return n;
    });
    const edgesBetween = (layout, a, b) => layout.edges.filter(e => e.source === a && e.target === b);
    const TC = 'summary:ATP:0000161';
    const CC = 'summary:ATP:0000311';

    test.each([[false], [true]])('the reverse transition survives (extra forward raw edge: %s)', (extraForward) => {
      const layout = computeLayout(withRaw(extraForward), ALL, new Set(), 1200, 800,
        { triggers: TRIGGERS, showAllTransitions: true });
      const handoffs = edgesBetween(layout, TC, CC);
      expect(handoffs).toHaveLength(1);
      expect(handoffs[0].isTrigger).toBe(true);
      const reverse = edgesBetween(layout, CC, TC);
      expect(reverse).toHaveLength(1);
      expect(reverse[0].data.transition_type).toBe('reset');
      expect(reverse[0].bidirectional).toBe(false);
      expect(reverse[0].reverseData).toBeNull();
    });
  });

  test('renders start nodes, lane and edge labels', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    document.body.appendChild(svg);
    const noop = () => {};
    renderDiagram(svg, layout, {
      onNodeHover: noop, onNodeLeave: noop, onEdgeHover: noop, onEdgeLeave: noop,
      onGroupClick: noop, onSubprocessClick: noop, onNodeClick: noop,
    });
    expect(svg.querySelector('g.wf-start-node text').textContent).toBe('Paper enters corpus');
    expect(svg.querySelector('text.wf-lane-label').textContent).toMatch(/No automatic start/);
    const labels = [...svg.querySelectorAll('text.wf-edge-label')].map(t => t.textContent);
    expect(labels).toContain('research articles');
  });
});
