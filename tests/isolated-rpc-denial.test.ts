import test from 'node:test'
import assert from 'node:assert/strict'
import { assertRpcDenied } from '../testing/isolated/assert-rpc-denied.ts'

test('RPC denial evidence accepts SQL permission and the exact application guard', () => {
  assert.doesNotThrow(() => assertRpcDenied({ data: null, error: { code: '42501' } }, 'anon'))
  assert.doesNotThrow(() => assertRpcDenied({
    data: { ok: false, error: 'Доступ запрещён' }, error: null,
  }, 'ordinary'))
  assert.doesNotThrow(() => assertRpcDenied({
    data: { error: 'Доступ запрещён' }, error: null,
  }, 'ordinary details'))
})

test('missing functions, server failures and unrelated business errors never pass as denial', () => {
  for (const code of ['PGRST202', 'PGRST301', 'XX000', '42883', '23505']) {
    assert.throws(() => assertRpcDenied({ data: null, error: { code } }, 'bad RPC'))
  }
  for (const data of [null, { ok: true }, { ok: false }, { error: 'not found' },
    { ok: true, error: 'Доступ запрещён' }]) {
    assert.throws(() => assertRpcDenied({ data, error: null }, 'unguarded RPC'))
  }
})
