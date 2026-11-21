import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildStatusDirective, daysSince, DEFAULT_STATUS } from './kinkDoctrine';

function expect(actual: unknown) {
  return {
    toBe(expected: unknown) {
      assert.strictEqual(actual, expected);
    },
    toContain(sub: string) {
      assert.ok(typeof actual === 'string' && actual.includes(sub), `Expected "${actual}" to contain "${sub}"`);
    },
    toMatch(rx: RegExp) {
      assert.match(String(actual), rx);
    },
    not: {
      toContain(sub: string) {
        assert.ok(typeof actual === 'string' && !actual.includes(sub), `Expected "${actual}" NOT to contain "${sub}"`);
      },
      toMatch(rx: RegExp) {
        assert.doesNotMatch(String(actual), rx);
      },
    },
  };
}

describe('kinkDoctrine', () => {
  it('counts whole days and clamps nonsense', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 86_400_000).toISOString();
    expect(daysSince(twoDaysAgo)).toBe(2);
    expect(daysSince('not-a-date')).toBe(0);
    expect(daysSince()).toBe(0);
  });

  it('names the bull only in cuckold status', () => {
    const cuck = buildStatusDirective({ status: 'cuckold', sphTier: 2, bullName: 'Marcus' });
    expect(cuck).toContain('Marcus');
    const free = buildStatusDirective({ status: 'pussyfree', sphTier: 2, bullName: 'Marcus' });
    expect(free).not.toContain('Marcus');
  });

  it('escalates tone with tier', () => {
    expect(buildStatusDirective({ status: 'pussyfree', sphTier: 1 })).toContain('once per conversation');
    expect(buildStatusDirective({ status: 'pussyfree', sphTier: 3 })).toContain('Lead with it');
  });

  it('omits the day count when there is no start date', () => {
    expect(buildStatusDirective(DEFAULT_STATUS)).not.toMatch(/It has been \d/);
  });
});
