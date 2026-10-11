import assert from 'node:assert/strict'

type RpcResult = {
  data: { ok?: boolean; error?: string } | null
  error: { code?: string } | null
}

// A missing RPC, schema-cache error or network failure does not prove access
// control. Only PostgreSQL's permission error or the existing explicit guard does.
export function assertRpcDenied(result: RpcResult, description: string) {
  if (result.error) {
    assert.equal(result.error.code, '42501', `${description}: unexpected API failure`)
    return
  }
  assert.ok(result.data && result.data.ok !== true
    && result.data.error === 'Доступ запрещён', `${description}: access guard not observed`)
}
