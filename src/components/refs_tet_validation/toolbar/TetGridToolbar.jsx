import React, { useMemo, useState } from 'react';
import { Form } from 'react-bootstrap';
import Select, { components as selectComponents } from 'react-select';

const compactSelectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: 34,
    borderColor: state.isFocused ? '#3f8fa3' : '#ccd6e0',
    borderRadius: 8,
    boxShadow: state.isFocused ? '0 0 0 3px rgba(63, 143, 163, 0.16)' : 'none',
    '&:hover': { borderColor: state.isFocused ? '#3f8fa3' : '#9eb2c4' },
  }),
  valueContainer: (base) => ({ ...base, padding: '0 6px' }),
  input: (base) => ({ ...base, margin: 0, padding: 0 }),
  indicatorsContainer: (base) => ({ ...base, minHeight: 34 }),
  multiValue: (base) => ({
    ...base,
    margin: '2px',
    borderRadius: 7,
    backgroundColor: '#e8f3f6',
  }),
  multiValueLabel: (base) => ({ ...base, color: '#204a57', fontWeight: 600 }),
  menu: (base) => ({ ...base, zIndex: 9999 }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
  placeholder: (base) => ({ ...base, color: '#444' }),
};

/**
 * Multi-select that collapses to a "X of Y selected" summary when the menu is
 * closed and only renders chips while the menu is open. Keeps the toolbar
 * compact when many items are selected. When `onSelectAll`/`onUnselectAll`
 * are provided, a small action bar with "Select all" / "Unselect all" is
 * rendered at the top of the dropdown menu — the buttons live inside the
 * popup so the toolbar itself stays clean.
 */
function CollapsibleMultiSelect({
  options,
  value,
  onChange,
  onSelectAll,
  onUnselectAll,
  placeholderOpen = 'Type to filter…',
  placeholderClosedFormatter = (selected, total) =>
    `${selected} of ${total} selected`,
}) {
  const [open, setOpen] = useState(false);
  const total = options.length;
  const selected = value.length;

  const MenuList = useMemo(() => {
    if (!onSelectAll && !onUnselectAll) return undefined;
    const Wrapped = (props) => (
      <selectComponents.MenuList {...props}>
        <div
          className="tetv-multiselect-actions"
          onMouseDown={(e) => e.preventDefault()}
        >
          {onSelectAll && (
            <button
              type="button"
              className="tetv-multiselect-action"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onSelectAll();
              }}
            >
              Select all
            </button>
          )}
          {onUnselectAll && (
            <button
              type="button"
              className="tetv-multiselect-action"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onUnselectAll();
              }}
            >
              Unselect all
            </button>
          )}
        </div>
        {props.children}
      </selectComponents.MenuList>
    );
    return Wrapped;
  }, [onSelectAll, onUnselectAll]);

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
      components={MenuList ? { MenuList } : undefined}
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
      <span className="tetv-toolbar-group tetv-toolbar-options">
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
        <Form.Check
          inline
          type="checkbox"
          id="tetv-show-authors"
          label="Show authors"
          title="Show the journal name and author list under each title"
          checked={!!displayOptions.showAuthors}
          onChange={(e) =>
            setDisplayOptions({
              ...displayOptions,
              showAuthors: e.target.checked,
            })
          }
        />
      </span>

      <span className="tetv-toolbar-group tetv-toolbar-select">
        <span className="tetv-toolbar-label">Topics:</span>
        <div className="tetv-select-shell">
          <CollapsibleMultiSelect
            options={topicOptions}
            value={topicSelectedValues}
            onChange={handleTopicChange}
            onSelectAll={() => handleTopicChange(topicOptions)}
            onUnselectAll={() => handleTopicChange([])}
            placeholderClosedFormatter={(s, t) =>
              `${s} of ${t} topics shown`
            }
          />
        </div>
      </span>

      <span className="tetv-toolbar-group tetv-toolbar-select">
        <span className="tetv-toolbar-label">Sources:</span>
        <div className="tetv-select-shell">
          <CollapsibleMultiSelect
            options={sourceOptions}
            value={sourceSelectedValues}
            onChange={handleSourceChange}
            onSelectAll={() => handleSourceChange(sourceOptions)}
            onUnselectAll={() => handleSourceChange([])}
            placeholderClosedFormatter={(s, t) =>
              `${s} of ${t} sources shown`
            }
          />
        </div>
      </span>
    </div>
  );
}
