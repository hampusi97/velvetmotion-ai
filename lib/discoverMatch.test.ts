import test from "node:test";
import assert from "node:assert/strict";
import { canonicalMatchId, firstTimeMatch, mergeMatchIds, previousSwipeIndex, reshuffleDiscoverCards } from "./discoverMatch";

test("secret-admirer card and visible companion share one reward identity", () => {
  assert.equal(canonicalMatchId("secret-nova"),"nova");
  assert.equal(firstTimeMatch(new Set(["nova"]),"secret-nova"),false);
  assert.equal(firstTimeMatch(new Set(["nova"]),"nova"),false);
  assert.equal(firstTimeMatch(new Set(["nova"]),"other"),true);
});

test("match state deduplicates local and IndexedDB lists", () => {
  assert.deepEqual(mergeMatchIds(["a","secret-b"],["b","c","a"],["c"]),["a","b","c"]);
});

test("reshuffle rearranges different companions without mutating original deck", () => {
  const deck=[{id:"a"},{id:"b"},{id:"c"},{id:"d"}];
  const shuffled=reshuffleDiscoverCards(deck,()=>0.99999999);
  assert.deepEqual(deck.map(x=>x.id),["a","b","c","d"]);
  assert.deepEqual([...shuffled].map(x=>x.id).sort(),["a","b","c","d"]);
  assert.notDeepEqual(shuffled.map(x=>x.id),deck.map(x=>x.id));
});

test("undo clamps to previous valid card without changing match eligibility", () => {
  const matched=new Set(["a"]);
  assert.equal(previousSwipeIndex(3),2);
  assert.equal(previousSwipeIndex(0),0);
  assert.equal(firstTimeMatch(matched,"a"),false);
});
