// Stateful host for the author reorder screen (SCRUM-6449).
//
// Renders BiblioAuthorReorderPanel either inside a Modal (default) or as a full page. The host
// owns every piece of working state so that toggling between the two views is free: React discards
// a component's state when it changes position in the tree, so if the panel held the order it
// would reset on every toggle. Biblio.js keeps this host at a fixed slot for the same reason.
//
// The working order is deliberately never written into referenceJsonLive: that would set
// referenceJsonHasChange, turn the Update button purple, and make the reference look dirty inside
// the very screen that is gated on it being clean. Cancel is therefore just an unmount.
import { useState, useRef, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';

import Container from 'react-bootstrap/Container';
import Modal from 'react-bootstrap/Modal';

import BiblioAuthorReorderPanel from './BiblioAuthorReorderPanel';
import { orderedAuthors, moveAuthorTo } from '../../utils/authorOrdering';
import { saveAuthorReorder } from '../../actions/authorOrderActions';
import { closeBiblioAuthorReorder, setBiblioAuthorReorderFullScreen,
  setBiblioUpdating } from '../../actions/biblioActions';
import { usePersonSettings } from '../settings/usePersonSettings';

// Drag stays available well past p99 of the corpus (23 authors; median 5), so the number-only
// fallback affects roughly 900 of 1.29M references -- exactly the lists where dragging without
// auto-scroll would have been miserable anyway. Measured on the 4002 corpus 2026-08-25: 1,290,052
// references with ordered authors, median 5, p95 14, p99 23, max 1014; 916 over 50, 176 over 100.
const AUTHOR_DRAG_MAX = 50;

// One unnamed row per curator, the same shape biblio_summary's Show More toggle uses
// (Biblio.js:335). rename/makeDefault/maxCount go unused: there is no alternate view to name.
const VIEW_SETTING_COMPONENT = 'biblio_author_reorder';
const VIEW_SETTING_NAME = 'Author Reorder View';

// Authors that exist server-side, in display order. A row added with "add authors" and never typed
// into carries author_id 'new': it is not on the reference yet, so it cannot be named in an
// ordering payload -- and it cannot trip the absent-from-payload 422 either, for the same reason.
// orderedAuthors also drops person-only stubs (author_order null), which the endpoint rejects.
const reorderableAuthors = (authors) =>
  orderedAuthors(authors).filter((authorDict) => authorDict.author_id !== 'new');

const sameOrder = (a, b) =>
  a.length === b.length && a.every((authorDict, i) => authorDict.author_id === b[i].author_id);

const BiblioAuthorReorder = () => {
  const dispatch = useDispatch();
  const referenceCurie = useSelector((state) => state.biblio.referenceCurie);
  const referenceJsonLive = useSelector((state) => state.biblio.referenceJsonLive);
  const biblioUpdating = useSelector((state) => state.biblio.biblioUpdating);
  const fullScreen = useSelector((state) => state.biblio.authorReorderFullScreen);
  const accessToken = useSelector((state) => state.isLogged.accessToken);
  const email = useSelector((state) => state.isLogged.email);

  const [order, setOrder] = useState(() => reorderableAuthors(referenceJsonLive.authors));
  const initialIds = useRef(order.map((authorDict) => authorDict.author_id));
  const [errorMessage, setErrorMessage] = useState('');
  const [dragIndex, setDragIndex] = useState(null);
  // the order box being typed into, so a half-typed "1" of "12" does not reshuffle mid-keystroke
  const [pending, setPending] = useState(null);
  // Stepwise undo rather than a revert-to-original button: Cancel already restores the saved order
  // (it just leaves too), so a revert control would duplicate it, while this recovers from one
  // misjudged drop without discarding every good move before it.
  const [history, setHistory] = useState([]);

  const { load, seed, create, selectedSettingId, savePayloadTo } = usePersonSettings({
    token: accessToken, email, componentName: VIEW_SETTING_COMPONENT, maxCount: 1,
  });

  // Read the remembered view once per mount, using load()'s return value rather than reacting to
  // the settings state in a second effect. Biblio.js:314 needs a settingsLoaded guard precisely
  // because it does the latter, and without it the effect fires before the load resolves and
  // creates duplicate rows. `picked` comes from pickDefaultSetting inside the hook, so this also
  // avoids the is_default / default_setting mismatch hand-rolled at Biblio.js:322.
  useEffect(() => {
    if (!accessToken || !email) { return; }
    load().then(({ existing, picked }) => {
      if (existing.length > 0) {
        const row = picked || existing[0];
        dispatch(setBiblioAuthorReorderFullScreen(Boolean(row.json_settings?.fullScreen)));
      } else {
        // returned, so a rejection reaches the catch below instead of escaping as an unhandled
        // promise rejection -- seed re-throws, and load's "no person found" branch reaches here
        return seed({ name: VIEW_SETTING_NAME, payload: { fullScreen: false } });
      }
    }).catch((error) => console.error('Failed to load author reorder view setting:', error));
  }, [accessToken, email, load, seed, dispatch]);

  const onToggleView = useCallback(async () => {
    const newValue = !fullScreen;
    dispatch(setBiblioAuthorReorderFullScreen(newValue));   // optimistic, instant
    try {
      if (selectedSettingId) { await savePayloadTo(selectedSettingId, { fullScreen: newValue }); }
      else { await create(VIEW_SETTING_NAME, { fullScreen: newValue }); }
    } catch (error) {
      // the view already changed; failing to remember it is not worth interrupting the reorder
      console.error('Failed to save author reorder view setting:', error);
    }
  }, [fullScreen, selectedSettingId, savePayloadTo, create, dispatch]);

  const saving = biblioUpdating > 0;

  // Deliberately computed from the committed order only, NOT from `pending`. Curators read the
  // LIST to decide what will be saved, not the number boxes, so the button has to track the list:
  // enabling Save while the rows sit unmoved would promise a change the list does not show.
  //
  // A typed or stepped number therefore does not make this true. It cannot: an unapplied number is
  // not part of the order, so saving would ignore it. The row's own check button applies it first,
  // and `pendingApplicable` below disables Save until that happens, so there is no state where
  // Save is available and would silently drop a visible edit.
  const changed = order.some((authorDict, i) => authorDict.author_id !== initialIds.current[i]);

  const applyMove = (fromIndex, toOrder) => {
    const next = moveAuthorTo(order, fromIndex, toOrder);
    // a drop onto the row's own position, or a typed order equal to the current one, is not a move
    // -- pushing it would make undo look broken by needing two clicks to do anything
    if (sameOrder(next, order)) { return; }
    setErrorMessage('');
    // Any committed move renumbers the rows, so a number typed against an old position no longer
    // means what the curator typed. Clearing here covers the drag path too: without it, dragging
    // while a harmless same-position value sat in a box turned it into a different position and
    // locked the whole list with no keystroke.
    setPending(null);
    setHistory(history.concat([order]));
    setOrder(next);
  };

  // The row's check button is the only path from a typed or stepped number to an actual move.
  // Blur deliberately does not commit: the stepper arrows may never focus the input, so a
  // focus-based trigger left arrow-clicking with no way to take effect at all.
  const onApplyPending = () => {
    if (!pending) { return; }
    const fromIndex = order.findIndex((authorDict) => authorDict.author_id === pending.authorId);
    const toOrder = parseInt(pending.value, 10);
    setPending(null);
    if (fromIndex < 0 || Number.isNaN(toOrder)) { return; }
    applyMove(fromIndex, toOrder);
  };

  const onCancelPending = () => setPending(null);

  // A pending value only counts as unresolved once it is a valid number AND would actually move
  // the row. Typing back the number a row already has, or emptying the box, leaves nothing to apply
  // -- so it must not lock the list or grey out Save. The discard button stays available in those
  // states regardless, which is what clears the box.
  //
  // Compared against the CLAMPED destination, because that is what moveAuthorTo will use. Against
  // the raw typed value, 999 on the last row of ten counted as applicable: the list locked and the
  // check rendered enabled, then clicking it clamped to 10, matched the current order and did
  // nothing, with no feedback. The panel takes this value rather than recomputing it, so the two
  // cannot drift apart again.
  const pendingIndex = pending
    ? order.findIndex((authorDict) => authorDict.author_id === pending.authorId) : -1;
  const pendingTypedOrder = pending ? parseInt(pending.value, 10) : NaN;
  const pendingTargetOrder = Number.isNaN(pendingTypedOrder) ? NaN
    : Math.min(Math.max(Math.trunc(pendingTypedOrder), 1), order.length);
  const pendingApplicable = pendingIndex >= 0 && !Number.isNaN(pendingTargetOrder)
    && pendingTargetOrder !== pendingIndex + 1;

  // A drag released outside the list, or cancelled with Escape, fires no drop -- without this the
  // stale index would survive and aim a later drop at the wrong author.
  const onDragEnd = () => setDragIndex(null);

  const onDropAt = (toIndex) => {
    if (dragIndex === null) { return; }
    applyMove(dragIndex, toIndex + 1);
    setDragIndex(null);
  };

  const onUndo = () => {
    // Undoing renumbers the rows, so a typed number would afterwards refer to a position the
    // curator never chose. Abandon it with the move being reversed. (applyMove clears pending for
    // the same reason, but onUndo pops history directly rather than going through it.)
    setPending(null);
    if (history.length === 0) { return; }
    setErrorMessage('');
    setOrder(history[history.length - 1]);
    setHistory(history.slice(0, -1));
  };

  const onCancel = () => dispatch(closeBiblioAuthorReorder());

  const onSave = async () => {
    setErrorMessage('');
    // always contiguous from 1 and always every ordered author, so the repeat-order and
    // absent-from-payload 422 rules cannot be tripped by construction
    const ordering = order.map((authorDict, index) => ({
      author_id: authorDict.author_id,
      author_order: index + 1,
    }));
    dispatch(setBiblioUpdating(1));
    const result = await dispatch(saveAuthorReorder(referenceCurie, ordering));
    if (result.ok) { dispatch(closeBiblioAuthorReorder()); }
    else { setErrorMessage(result.message); }
  };

  const panel = (
    <BiblioAuthorReorderPanel
      order={order} pending={pending} errorMessage={errorMessage}
      dragMax={AUTHOR_DRAG_MAX} dragEnabled={order.length <= AUTHOR_DRAG_MAX}
      dragActive={dragIndex !== null} onDragEnd={onDragEnd}
      saving={saving} changed={changed} canUndo={history.length > 0} fullScreen={fullScreen}
      onPendingChange={(authorId, value) => setPending({ authorId, value })}
      onApplyPending={onApplyPending} onCancelPending={onCancelPending}
      pendingApplicable={pendingApplicable}
      onDragStart={setDragIndex} onDropAt={onDropAt}
      onUndo={onUndo} onSave={onSave} onCancel={onCancel} onToggleView={onToggleView}
    />
  );

  // Both views are the same Modal, differing only by dialog class. Full screen as an in-page
  // render could not hide the nav bar or the reference id box: NavigationBar is rendered by
  // AppWithRouterAccess, an ancestor of this subtree, and BiblioIdQuery sits above the router in
  // Biblio.js -- neither is reachable from here. A modal sidesteps that entirely by escaping
  // layout, and its backdrop (z-index 1040/1050, over the navbar's 1030) covers both. So the
  // reference cannot be changed from either view.
  //
  // backdrop="static" + keyboard={false}: a stray click outside or an Escape would discard the
  // arrangement silently. Cancel is the deliberate exit.
  //
  // centered only for the windowed view: Bootstrap's .modal-dialog is top-anchored with
  // margin: 1.75rem auto, so the space below varies with the list height while the gap above
  // stays fixed. Centring splits it evenly. The full-screen variant sets its own margin.
  return (
    <Modal show size="xl" backdrop="static" keyboard={false} onHide={onCancel}
      centered={!fullScreen}
      dialogClassName={fullScreen ? 'biblio-reorder-modal-full' : 'biblio-reorder-modal'}>
      {/* Container, matching BiblioEditor.js:1613, so the list is the same width as the editor
          the curator just came from rather than stretching to the viewport. The two views then
          differ only in height -- which is the point of expanding on a long author list. */}
      <Modal.Body><Container>{panel}</Container></Modal.Body>
    </Modal>);
}; // const BiblioAuthorReorder

export default BiblioAuthorReorder;
