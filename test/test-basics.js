import DKV from '../index.js'
import { CID } from 'multiformats'
import { deepStrictEqual as same } from 'assert'

const blocks = new Map()

const noop = () => {}

const mock = ({ onBlock, onPin } = {}) => {
  onBlock = onBlock || noop
  onPin = onPin || noop
  const put = (bytes, { cid }) => {
    const block = { bytes, cid: CID.parse(cid) }
    blocks.set(cid, block)
    onBlock(block)
  }
  const get = ref => {
    if (!blocks.has(ref)) throw new Error('Missing block')
    const { bytes, cid } = blocks.get(ref)
    return { data: bytes, cid }
  }
  return { block: { put, get }, pin: onPin }
}

export default async test => {
  test('put/get roundtrip', async test => {
    const ipfs = mock()
    let kv = await DKV.empty(ipfs)
    kv = await kv.set('test', { hello: 'world' })
    same(await kv.get('test'), { hello: 'world' })
  })
}
