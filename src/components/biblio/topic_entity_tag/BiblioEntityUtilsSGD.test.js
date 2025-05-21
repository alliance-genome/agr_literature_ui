import { setDisplayTag } from './BiblioEntityUtilsSGD';

describe('setDisplayTag', () => {
  describe('primary topics', () => {
    test('should return primary display for gene ontology topic', () => {
      expect(setDisplayTag('ATP:0000012')).toBe('ATP:0000147');
    });

    test('should return primary display for classical phenotype topic', () => {
      expect(setDisplayTag('ATP:0000079')).toBe('ATP:0000147');
    });

    test('should return primary display for headline information topic', () => {
      expect(setDisplayTag('ATP:0000129')).toBe('ATP:0000147');
    });

    test('should return primary display for other primary information topic', () => {
      expect(setDisplayTag('ATP:0000147')).toBe('ATP:0000147');
    });
  });

  describe('omics topics', () => {
    test('should return omics display for high throughput phenotype topic', () => {
      expect(setDisplayTag('ATP:0000085')).toBe('ATP:0000148');
    });

    test('should return omics display for other HTP data topic', () => {
      expect(setDisplayTag('ATP:0000150')).toBe('ATP:0000148');
    });
  });

  describe('additional topics', () => {
    test('should return additional display for homology/disease topic', () => {
      expect(setDisplayTag('ATP:0000011')).toBe('ATP:0000132');
    });

    test('should return additional display for post translational modification topic', () => {
      expect(setDisplayTag('ATP:0000088')).toBe('ATP:0000132');
    });

    test('should return additional display for regulatory interaction topic', () => {
      expect(setDisplayTag('ATP:0000070')).toBe('ATP:0000132');
    });

    test('should return additional display for pathway topic', () => {
      expect(setDisplayTag('ATP:0000022')).toBe('ATP:0000132');
    });

    test('should return additional display for allele topic', () => {
      expect(setDisplayTag('ATP:0000006')).toBe('ATP:0000132');
    });

    test('should return additional display for other additional literature topic', () => {
      expect(setDisplayTag('ATP:0000132')).toBe('ATP:0000132');
    });
  });

  describe('review topic', () => {
    test('should return review display for review topic', () => {
      expect(setDisplayTag('ATP:0000130')).toBe('ATP:0000130');
    });
  });

  describe('unknown topics', () => {
    test('should return empty string for unknown topic', () => {
      expect(setDisplayTag('ATP:9999999')).toBe('');
    });

    test('should return empty string for empty string input', () => {
      expect(setDisplayTag('')).toBe('');
    });

    test('should return empty string for null input', () => {
      expect(setDisplayTag(null)).toBe('');
    });

    test('should return empty string for undefined input', () => {
      expect(setDisplayTag(undefined)).toBe('');
    });

    test('should return empty string for non-ATP format input', () => {
      expect(setDisplayTag('INVALID:123')).toBe('');
    });
  });
});