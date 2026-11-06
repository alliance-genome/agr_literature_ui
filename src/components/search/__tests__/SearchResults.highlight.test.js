import { joinHighlightFragments } from '../SearchResults';

// SCRUM-6490: matching-text fragments were rendered with the array's default
// comma join, so "...<em>DNA</em>" and "<em>damage</em>..." showed as "DNA,damage".

describe('joinHighlightFragments', () => {
  test('separates passages of a text field with an ellipsis', () => {
    expect(joinHighlightFragments('abstract', ['first <em>DNA</em> passage.', 'second passage.']))
      .toBe('first <em>DNA</em> passage. &hellip; second passage.');
  });

  test('separates the values of a list field with a comma and space', () => {
    expect(joinHighlightFragments('mesh', ['<em>DNA</em> <em>Damage</em>', '<em>DNA</em> Repair']))
      .toBe('<em>DNA</em> <em>Damage</em>, <em>DNA</em> Repair');
    expect(joinHighlightFragments('keywords', ['a', 'b'])).toBe('a, b');
  });

  test('shows a repeated fragment once', () => {
    const heading = '<em>Deoxyadenine</em> <em>Nucleotides</em>';
    expect(joinHighlightFragments('mesh', [heading, heading, '<em>Deoxyadenosines</em>']))
      .toBe(`${heading}, <em>Deoxyadenosines</em>`);
  });

  test('leaves a single fragment or a plain string unchanged', () => {
    expect(joinHighlightFragments('title', ['only one'])).toBe('only one');
    expect(joinHighlightFragments('title', 'a string')).toBe('a string');
  });
});
