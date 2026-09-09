import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('settings exposes cloud sync diagnostics and manual retry',()=>{
  for(const id of ['syncDiagConnection','syncDiagPending','syncDiagLast','syncDiagError','retryCloudSyncBtn']){
    assert.match(html,new RegExp(`id=["']${id}["']`));
  }
  assert.match(html,/function renderSyncDiagnostics\(\)/);
  assert.match(html,/await retryPendingCloudSync\(\)/);
});

test('cloud diagnostics distinguish offline, signed-in, and pending state',()=>{
  assert.match(html,/Offline/);
  assert.match(html,/Online · signed in/);
  assert.match(html,/Online · sign in required/);
  assert.match(html,/games\.filter\(g=>!g\.cloudSyncedAt\)/);
});
