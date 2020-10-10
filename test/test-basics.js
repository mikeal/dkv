import DKV from '../index.js'
import { deepStrictEqual as same } from 'assert'
import IPFS from 'ipfs'

const opts = { offline: true, start: false, silent: true }

// terrible hack until we can get a better ipfs instance for testing
setTimeout(() => {
  process.exit()
}, 1000 * 3)

export default async test => {
  test('put/get roundtrip', async test => {
    const ipfs = await IPFS.create(opts)
    let kv = await DKV.empty(ipfs)
    kv = await kv.set('test', { hello: 'world' })
    same(await kv.get('test'), { hello: 'world' })
    ipfs.stop()
  })
}
