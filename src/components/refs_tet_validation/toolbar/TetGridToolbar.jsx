import React, { useMemo, useState } from 'react';
import { Form } from 'react-bootstrap';
import Select from 'react-select';

const compactSelectStyles = {
  control: (base) => ({ ...base, minHeight: 30 }),
  valueContainer: (base) => ({ ...base, padding: '0 6px' }),
  input: (base) => ({ ...base, margin: 0, padding: 0 }),
  indicatorsContainer: (base) => ({ ...base, height: 30 }),
  multiValue: (base) => ({ ...base, margin: '2px' }),
  menu: (base) => ({ ...base, zIndex: 9999 }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
  placeholder: (base) => ({ ...base, color: '#444' }),
};

/**
 * Multi-select that collapses to a "X of Y selected" summary when the menu is
 * closed and only renders chips while the menu is open. Keeps the toolbar
 * compact when many items are selected.
 */
function CollapsibleMultiSelect({
  options,
  value,
  onChange,
  placeholderOpen = 'Type to filter…',
  placeholderClosedFormatter = (selected, total) =>
    `${selected} of ${total} selected`,
}) {
  const [open, setOpen] = useState(false);
  const total = options.length;
  const selected = value.length;
  return (
    <Select
      isMulti
      isClearable={false}
      closeMenuOnSelect={false}
      hideSelectedOptions={false}
      controlShouldRenderValue={open}
      placeholder={
        open ? placeholderOpen : placeholderClosedFormatter(selected, total)
      }
      options={options}
      value={value}
      onChange={onChange}
      onMenuOpen={() => setOpen(true)}
      onMenuClose={() => setOpen(false)}
      styles={compactSelectStyles}
      menuPortalTarget={document.body}
      menuPosition="fixed"
    />
  );
}

export default function TetGridToolbar({
  displayOptions,
  setDisplayOptions,
  allTopics,
  hiddenTopicCuries,
  setHiddenTopicCuries,
  allSources,
  sourceFilterModel,
  setSourceFilterModel,
}) {
  // Topics multi-select state — selected = currently visible (NOT hidden)
  const topicOptions = useMemo(
    () =>
      (allTopics || []).map((t) => ({ value: t.curie, label: t.name || t.curie })),
    [allTopics]
  );
  const topicSelectedValues = useMemo(
    () => topicOptions.filter((o) => !hiddenTopicCuries.has(o.value)),
    [topicOptions, hiddenTopicCuries]
  );

  function handleTopicChange(selected) {
    const visibleCuries = new Set((selected || []).map((s) => s.value));
    const next = new Set(
      (allTopics || [])
        .map((t) => t.curie)
        .filter((c) => !visibleCuries.has(c))
    );
    setHiddenTopicCuries(next);
  }

  // Sources multi-select state — selected = currently visible
  const sourceOptions = useMemo(
    () => (allSources || []).map((s) => ({ value: s, label: s })),
    [allSources]
  );
  const sourceSelectedValues = useMemo(() => {
    if (!sourceFilterModel) return sourceOptions; // null === all selected
    const set = new Set(sourceFilterModel);
    return sourceOptions.filter((o) => set.has(o.value));
  }, [sourceOptions, sourceFilterModel]);

  function handleSourceChange(selected) {
    const arr = (selected || []).map((s) => s.value);
    setSourceFilterModel(
      arr.length === sourceOptions.length ? null : arr
    );
  }

  return (
    <div className="tetv-toolbar">
      <span className="tetv-toolbar-group">
        <Form.Check
          inline
          type="checkbox"
          id="tetv-inline"
          label="Expand notes"
          checked={!!displayOptions.inlineNote}
          onChange={(e) =>
            setDisplayOptions({ ...displayOptions, inlineNote: e.target.checked })
          }
        />
        <Form.Check
          inline
          type="checkbox"
          id="tetv-level"
          label="Confidence level"
          checked={!!displayOptions.showLevel}
          onChange={(e) =>
            setDisplayOptions({ ...displayOptions, showLevel: e.target.checked })
          }
        />
        <Form.Check
          inline
          type="checkbox"
          id="tetv-score"
          label="Confidence score"
          checked={!!displayOptions.showScore}
          onChange={(e) =>
            setDisplayOptions({ ...displayOptions, showScore: e.target.checked })
          }
        />
      </span>

      <span className="tetv-toolbar-group tetv-toolbar-select">
        <span className="tetv-toolbar-label">Topics:</span>
        <button
          type="button"
          className="tetv-quick-link"
          onClick={() => handleTopicChange(topicOptions)}
          title="Select all topics"
        >
          All
        </button>
        <button
          type="button"
          className="tetv-quick-link"
          onClick={() => handleTopicChange([])}
          title="Deselect all topics"
        >
          None
        </button>
        <div style={{ minWidth: 240, flex: '1 1 240px' }}>
          <CollapsibleMultiSelect
            options={topicOptions}
            value={topicSelectedValues}
            onChange={handleTopicChange}
            placeholderClosedFormatter={(s, t) =>
              `${s} of ${t} topics shown`
            }
          />
        </div>
      </span>

      <span className="tetv-toolbar-group tetv-toolbar-select">
        <span className="tetv-toolbar-label">Sources:</span>
        <button
          type="button"
          className="tetv-quick-link"
          onClick={() => handleSourceChange(sourceOptions)}
          title="Select all sources"
        >
          All
        </button>
        <button
          type="button"
          className="tetv-quick-link"
          onClick={() => handleSourceChange([])}
          title="Deselect all sources"
        >
          None
        </button>
        <div style={{ minWidth: 240, flex: '1 1 240px' }}>
          <CollapsibleMultiSelect
            options={sourceOptions}
            value={sourceSelectedValues}
            onChange={handleSourceChange}
            placeholderClosedFormatter={(s, t) =>
              `${s} of ${t} sources shown`
            }
          />
        </div>
      </span>
    </div>
  );
}
