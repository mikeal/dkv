import DKV from '../index.js'
import { CID } from 'multiformats'
import { deepStrictEqual as same } from 'assert'
import IPFS from 'ipfs'

const blocks = new Map()

const noop = () => {}

const opts = { offline: true, start: false, silent: true }

export default async test => {
  test('put/get roundtrip', async test => {
    const ipfs = await IPFS.create(opts)
    let kv = await DKV.empty(ipfs)
    kv = await kv.set('test', { hello: 'world' })
    same(await kv.get('test'), { hello: 'world' })
    ipfs.stop()
  })
}
