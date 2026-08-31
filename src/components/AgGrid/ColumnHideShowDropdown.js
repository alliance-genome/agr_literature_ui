// src/components/AgGrid/ColumnHideShowDropdown.js
import React, { useCallback } from 'react';
import { Button, ButtonGroup, Dropdown, Form } from 'react-bootstrap';

/**
 * "Hide/Show Columns" dropdown for AG Grid tables, extracted from the TET
 * editor's column selection (SCRUM-6446) so other tables (e.g. the workflow
 * editor's curation table) can offer the same control.
 *
 * The parent owns the checkbox list state:
 * - items / setItems: [{ id, field, headerName, checked }] — `checked` mirrors
 *   column visibility. Parents that persist preferences (BiblioPreferenceControls)
 *   already keep this list in sync with applied settings.
 * - getGridApi(): the grid's API (visibility is applied per column with
 *   applyColumnState, so it also works for children of column groups).
 * - getInitialItems(): the default list, for "Restore Default".
 */
const CheckboxMenu = React.forwardRef(
  (
    {
      children,
      style,
      className,
      'aria-labelledby': labeledBy,
      onSelectAll,
      onSelectNone,
      onDefault
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        style={style}
        className={`${className} CheckboxMenu`}
        aria-labelledby={labeledBy}
      >
        <div className="d-flex flex-column" style={{ maxHeight: 'calc(100vh)', overflow: 'none' }}>
          <div className="dropdown-item border-top pt-2 pb-0">
            <ButtonGroup size="sm">
              <Button variant="link" onClick={onSelectAll}>
                Show All
              </Button>
              <Button variant="link" onClick={onSelectNone}>
                Hide All
              </Button>
              <Button variant="link" onClick={onDefault}>
                Restore Default
              </Button>
            </ButtonGroup>
          </div>
          <ul className="list-unstyled flex-shrink mb-0" style={{ overflow: 'auto' }}>
            {children}
          </ul>
        </div>
      </div>
    );
  }
);

const CheckDropdownItem = React.forwardRef(({ children, id, checked, onChange }, ref) => (
  <Form.Group ref={ref} className="dropdown-item mb-0" controlId={id}>
    <Form.Check
      type="checkbox"
      label={children}
      checked={checked}
      onChange={onChange && onChange.bind(onChange, id)}
    />
  </Form.Group>
));

const ColumnHideShowDropdown = ({
  items,
  setItems,
  getGridApi,
  getInitialItems,
  toggleId = 'dropdown-hide-show-columns'
}) => {
  const handleChecked = useCallback(
    (key, event) => {
      // Replace the toggled entry instead of mutating it: `items` is often the
      // parent's memoized default list itself (getInitialItems), and mutating
      // shared objects would corrupt "Restore Default" / reset paths.
      const newItems = items.map((i) =>
        i.id === key ? { ...i, checked: event.target.checked } : i
      );
      const item = newItems.find((i) => i.id === key);
      if (!item) return;

      const api = getGridApi();
      api?.applyColumnState?.({ state: [{ colId: item.field, hide: !item.checked }] });

      setItems(newItems);
      setTimeout(() => api?.refreshHeader?.(), 10);
    },
    [getGridApi, items, setItems]
  );

  const handleSelectAll = useCallback(() => {
    const api = getGridApi();
    const newItems = [...items].map((i) => ({ ...i, checked: true }));
    newItems.forEach((i) => api?.applyColumnState?.({ state: [{ colId: i.field, hide: false }] }));
    setItems(newItems);
    setTimeout(() => api?.refreshHeader?.(), 10);
  }, [getGridApi, items, setItems]);

  const handleSelectNone = useCallback(() => {
    const api = getGridApi();
    const newItems = [...items].map((i) => ({ ...i, checked: false }));
    newItems.forEach((i) => api?.applyColumnState?.({ state: [{ colId: i.field, hide: true }] }));
    setItems(newItems);
    setTimeout(() => api?.refreshHeader?.(), 10);
  }, [getGridApi, items, setItems]);

  const handleSelectDefault = useCallback(() => {
    const api = getGridApi();
    const defaultItems = getInitialItems();
    setItems(defaultItems);
    defaultItems.forEach((i) => api?.applyColumnState?.({ state: [{ colId: i.field, hide: !i.checked }] }));
    setTimeout(() => api?.refreshHeader?.(), 10);
  }, [getGridApi, getInitialItems, setItems]);

  return (
    <Dropdown>
      <Dropdown.Toggle variant="primary" id={toggleId}>
        Hide/Show Columns
      </Dropdown.Toggle>
      <Dropdown.Menu
        as={CheckboxMenu}
        onSelectAll={handleSelectAll}
        onSelectNone={handleSelectNone}
        onDefault={handleSelectDefault}
        renderOnMount={false}
      >
        {items.map((i) => (
          <Dropdown.Item
            key={i.field}
            as={CheckDropdownItem}
            id={i.id}
            checked={i.checked}
            onChange={handleChecked}
          >
            {i.headerName}
          </Dropdown.Item>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  );
};

export default ColumnHideShowDropdown;
