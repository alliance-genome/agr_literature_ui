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
  order, pending, errorMessage, dragMax, dragEnabled, saving, changed, canUndo, fullScreen,
  onPendingChange, onCommitPending, onDragStart, onDropAt, onUndo, onSave, onCancel, onToggleView,
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
          <Button variant="primary" disabled={saving || !changed || order.length === 0}
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

    {order.map((authorDict, index) => (
      <Row
        key={authorDict.author_id}
        className={`Row-general biblio-reorder-row ${(index % 2 === 0) ? 'row-even' : 'row-odd'}`}
        draggable={dragEnabled && !saving}
        onDragStart={() => onDragStart(index)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={() => onDropAt(index)}
        style={{ cursor: (dragEnabled && !saving) ? 'move' : 'default' }}
      >
        <Col sm="1">
          <Form.Control
            type="number"
            min="1"
            max={order.length}
            size="sm"
            disabled={saving}
            value={(pending && pending.authorId === authorDict.author_id)
              ? pending.value : String(index + 1)}
            onChange={(e) => onPendingChange(authorDict.author_id, e.target.value)}
            onBlur={() => onCommitPending(authorDict.author_id)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.target.blur(); } }}
          />
        </Col>
        <Col className="Col-general" sm="11">
          {/* same rendering as BiblioDisplay's author rows: names legitimately carry markup */}
          <span dangerouslySetInnerHTML={{ __html: authorDict.name }} />
        </Col>
      </Row>
    ))}
  </>
);

export default BiblioAuthorReorderPanel;
