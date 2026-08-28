// Presentational half of the author reorder screen (SCRUM-6449).
//
// Deliberately owns no state: the same panel renders inside a Modal and as a full page, and the
// working order has to survive toggling between the two. React discards a component's state when
// it moves position in the tree, so anything held here would reset on every toggle -- reorder
// fifteen authors, click expand, start again. BiblioAuthorReorder.js (the host) keeps the state
// at a fixed slot and passes it down.
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
// Not faUndo: that glyph means "revert this field to its database value" ~19 times in
// BiblioEditor, which here is Cancel's job. Not faTrashAlt for Cancel either: trash means
// "destroy this record" on every delete button in the app, and Cancel destroys nothing.
import { faStepBackward, faCheck, faTimes, faExpand, faCompress } from '@fortawesome/free-solid-svg-icons';

import './biblioAuthorReorder.css';

const BiblioAuthorReorderPanel = ({
  order, pending, errorMessage, dragMax, dragEnabled, dragActive, saving, changed, canUndo,
  fullScreen, pendingApplicable, onPendingChange, onApplyPending, onCancelPending, onDragStart,
  onDragEnd, onDropAt, onUndo, onSave, onCancel, onToggleView,
}) => (
  <>
    {/* Centring is three-part -- an equal-weight spacer either side of the button group -- so the
        group sits at the middle whatever the title's width. Centring inside a part-width column
        instead puts them two thirds across. */}
    <Row className="Row-general biblio-reorder-header">
      <Col className="Col-general" sm="12" style={{ gap: '0.5rem' }}>
        <strong style={{ flex: 1, whiteSpace: 'nowrap' }}>Reorder authors</strong>
        <span style={{ display: 'flex', gap: '0.5rem' }}>
          {/* preventDefault stops the browser moving focus here on mousedown. Without it, pressing
              Undo blurs a focused order box, blur commits that move and pushes it onto the undo
              history, and the click then pops the entry it just created -- so Undo appears to do
              nothing while the move the curator meant to reverse is untouched. */}
          <Button variant="outline-secondary" disabled={saving || !canUndo}
            title="Undo the last move; Cancel discards them all"
            onMouseDown={(e) => e.preventDefault()}
            onClick={onUndo}><FontAwesomeIcon icon={faStepBackward} /> Undo one</Button>
          <Button variant="primary"
            disabled={saving || !changed || order.length === 0 || pendingApplicable}
            onClick={onSave}>
            <FontAwesomeIcon icon={faCheck} /> {saving ? 'Saving...' : 'Save order'}
          </Button>
          <Button variant="outline-secondary" disabled={saving}
            title="Discard every move and return to the editor"
            onClick={onCancel}>
            <FontAwesomeIcon icon={faTimes} /> Cancel</Button>
        </span>
        <span style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
          {/* Labelled, unlike a one-shot action button, because this one is a toggle: the icon
              alone cannot say which way it points. The label names the destination, not the
              current state. Kept size="sm" and out of the centred group -- it changes the
              presentation, not the data. */}
          <Button variant="outline-secondary" size="sm" disabled={saving}
            title={fullScreen ? 'Show in a window' : 'Expand to the full page'}
            onClick={onToggleView}>
            <FontAwesomeIcon icon={fullScreen ? faCompress : faExpand} />
            {' '}{fullScreen ? 'Shrink' : 'Expand'}
          </Button>
        </span>
      </Col>
    </Row>

    {errorMessage === '' ? null : (<Alert variant="danger">{errorMessage}</Alert>)}
    {dragEnabled ? null : (
      <Alert variant="info">
        Drag is disabled above {dragMax} authors; set the order number instead.
      </Alert>
    )}
    {order.length > 0 ? null : (
      <Alert variant="warning">This reference has no saved authors to reorder.</Alert>
    )}

    {order.map((authorDict, index) => {
      // A number only counts as an edit once it differs from the row's current position, so
      // stepping back to where you started makes the buttons go away on their own.
      const isPendingRow = !!pending && pending.authorId === authorDict.author_id;
      const typedOrder = isPendingRow ? parseInt(pending.value, 10) : NaN;
      const canApply = !Number.isNaN(typedOrder) && typedOrder !== index + 1;
      // one edit at a time: every other box is inert while one is unresolved, so a change cannot
      // be stranded by clicking into a different row
      const inputDisabled = saving || (pendingApplicable && !isPendingRow);
      return (
      <Row
        key={authorDict.author_id}
        className={`Row-general biblio-reorder-row ${(index % 2 === 0) ? 'row-even' : 'row-odd'}`}
        draggable={dragEnabled && !saving && !pendingApplicable}
        onDragStart={() => onDragStart(index)}
        onDragEnd={onDragEnd}
        // preventDefault is what marks a row as a valid drop target, so it is conditional on one
        // of OUR rows being dragged. Unconditionally, every row accepts any drag source -- a file,
        // a link, selected text -- and dropping one would move whichever author dragIndex still
        // pointed at. Rows are inert for foreign drags now, which the browser handles as it does
        // anywhere else in the app.
        onDragOver={(e) => { if (dragActive) { e.preventDefault(); } }}
        onDrop={(e) => { if (!dragActive) { return; } e.preventDefault(); onDropAt(index); }}
        style={{ cursor: (dragEnabled && !saving && !pendingApplicable) ? 'move' : 'default' }}
      >
        <Col xs="auto" className="biblio-reorder-order-col">
          {/* No onBlur commit. The check is the only way a typed or stepped number takes effect,
              so nothing is applied by a focus change the curator did not think of as an action --
              which also makes this work when the stepper arrows never focus the input at all.
              Deliberately NOT an InputGroup: that shrinks the field to make room for the buttons,
              so the stepper arrows slide left the moment a number changes and a second click at
              the same spot lands on discard. The box is a fixed width and the buttons are added
              to its right, shifting the author name instead -- names moving is harmless, a
              stepper moving out from under the pointer is not. */}
          <div className="biblio-reorder-order-controls">
            <Form.Control
              type="number"
              size="sm"
              min="1"
              max={order.length}
              className="biblio-reorder-order-input"
              disabled={inputDisabled}
              value={isPendingRow ? pending.value : String(index + 1)}
              onChange={(e) => onPendingChange(authorDict.author_id, e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && canApply) { onApplyPending(); } }}
            />
            {isPendingRow ? (
              <>
                {/* outline-success resolves to Bootstrap 4's $success, #28a745 -- the same green
                    every other check in the UI uses (Tracker, Facets, ValidationByCurator,
                    BiblioFileManagement, BiblioWorkflow), taken from the variant rather than
                    hardcoded again here. */}
                <Button size="sm" variant="outline-success" disabled={!canApply}
                  title="Apply this order" onClick={onApplyPending}>
                  <FontAwesomeIcon icon={faCheck} /></Button>
                <Button size="sm" variant="outline-secondary" title="Discard this number"
                  onClick={onCancelPending}><FontAwesomeIcon icon={faTimes} /></Button>
              </>
            ) : null}
          </div>
        </Col>
        <Col className="Col-general">
          {/* same rendering as BiblioDisplay's author rows: names legitimately carry markup */}
          <span dangerouslySetInnerHTML={{ __html: authorDict.name }} />
        </Col>
      </Row>);
    })}
  </>
);

export default BiblioAuthorReorderPanel;
