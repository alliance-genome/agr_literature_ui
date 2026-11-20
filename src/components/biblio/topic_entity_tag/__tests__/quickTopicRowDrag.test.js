import { dragReorder } from '../quickTopicRowDrag';

const row = (curie) => ({ topic_curie: curie });
const rows = (...curies) => curies.map(row);
const order = (list) => list.map((r) => r.topic_curie);

describe('dragReorder', () => {
  describe('basic moves (pointer past the midpoint)', () => {
    it('moves a row down: it lands after the hovered row', () => {
      // A,B,C each 44px tall; dragging A over C with the pointer below C's midpoint.
      const next = dragReorder(rows('A', 'B', 'C'), 'A', 'C',
        { pointerY: 120, overTop: 88, overHeight: 44 });
      expect(order(next)).toEqual(['B', 'C', 'A']);
    });

    it('moves a row up: it lands before the hovered row', () => {
      const next = dragReorder(rows('A', 'B', 'C'), 'C', 'A',
        { pointerY: 10, overTop: 0, overHeight: 44 });
      expect(order(next)).toEqual(['C', 'A', 'B']);
    });

    it('reorders the full array around a visible target while filtered', () => {
      // Full [A,B,C,D], filtered view shows only B and D; dragging D above B.
      const next = dragReorder(rows('A', 'B', 'C', 'D'), 'D', 'B',
        { pointerY: 50, overTop: 44, overHeight: 44 });
      expect(order(next)).toEqual(['A', 'D', 'B', 'C']);
    });
  });

  describe('midpoint guard', () => {
    it('does not move down until the pointer passes the hovered midpoint', () => {
      expect(dragReorder(rows('A', 'B'), 'A', 'B',
        { pointerY: 50, overTop: 44, overHeight: 44 })).toBeNull(); // midpoint 66
      expect(order(dragReorder(rows('A', 'B'), 'A', 'B',
        { pointerY: 70, overTop: 44, overHeight: 44 }))).toEqual(['B', 'A']);
    });

    it('does not move up until the pointer passes the hovered midpoint', () => {
      expect(dragReorder(rows('A', 'B'), 'B', 'A',
        { pointerY: 30, overTop: 0, overHeight: 44 })).toBeNull(); // midpoint 22
      expect(order(dragReorder(rows('A', 'B'), 'B', 'A',
        { pointerY: 10, overTop: 0, overHeight: 44 }))).toEqual(['B', 'A']);
    });

    it('does not oscillate when a short row is dragged over tall rows', () => {
      // The review scenario: A(100px) at 0, B(100px) at 100, C(30px) at 200,
      // pointer held at y=150 while dragging C upwards over B.
      const initial = rows('A', 'B', 'C');
      const step1 = dragReorder(initial, 'C', 'B',
        { pointerY: 150, overTop: 100, overHeight: 100 }); // midpoint 150, moving up: allowed
      expect(order(step1)).toEqual(['A', 'C', 'B']);
      // After the move the layout is A(100) at 0, C(30) at 100, B(100) at 130.
      // The pointer (y=150) is still inside B, but C now sits ABOVE B, so a
      // move would be downwards and requires y >= B's new midpoint (180):
      // the very next mousemove must be a no-op, not a swap back.
      const step2 = dragReorder(step1, 'C', 'B',
        { pointerY: 150, overTop: 130, overHeight: 100 });
      expect(step2).toBeNull();
    });
  });

  describe('scrolled grid (pointer normalised into row-container space)', () => {
    // The scrolled-by-400px scenario from review: hovered row at rowTop=488
    // (midpoint 510), raw viewport-relative event.y of 120. The raw value
    // wrongly blocks the downward move; only the caller-normalised pointer
    // (event.y + getVerticalPixelRange().top = 520) may cross the midpoint.
    it('a raw viewport-relative pointer blocks a legitimate downward move', () => {
      expect(dragReorder(rows('A', 'B'), 'A', 'B',
        { pointerY: 120, overTop: 488, overHeight: 44 })).toBeNull();
    });

    it('the scroll-normalised pointer crosses the midpoint and moves', () => {
      expect(order(dragReorder(rows('A', 'B'), 'A', 'B',
        { pointerY: 120 + 400, overTop: 488, overHeight: 44 }))).toEqual(['B', 'A']);
    });
  });

  describe('no-ops and fallbacks', () => {
    it('returns null when hovering the dragged row itself', () => {
      expect(dragReorder(rows('A', 'B'), 'A', 'A',
        { pointerY: 10, overTop: 0, overHeight: 44 })).toBeNull();
    });

    it('returns null for curies not in the list', () => {
      expect(dragReorder(rows('A', 'B'), 'X', 'B', {})).toBeNull();
      expect(dragReorder(rows('A', 'B'), 'A', 'X', {})).toBeNull();
    });

    it('swaps immediately when geometry is unavailable', () => {
      expect(order(dragReorder(rows('A', 'B', 'C'), 'A', 'C', {})))
        .toEqual(['B', 'C', 'A']);
      expect(order(dragReorder(rows('A', 'B', 'C'), 'A', 'C')))
        .toEqual(['B', 'C', 'A']);
    });

    it('does not mutate the input array', () => {
      const input = rows('A', 'B', 'C');
      dragReorder(input, 'A', 'C', {});
      expect(order(input)).toEqual(['A', 'B', 'C']);
    });
  });
});
