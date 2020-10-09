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

/*
const validate = ({blocks, pins}) => {
  blocks = blocks || []
  pins = pins || []
  const onBlock = ({bytes, cid}) => {
    const block = blocks.shift()
    if (!block) throw new Error('Not expecting block')
    same(bytes, block.bytes)
    same(cid.toString(), block.cid.toString())
  }
  const onPin = cid => {
    const pin = pins.shift()
    same(cid, pin.toString())
  }
}
*/

export default async test => {
  test('put/get roundtrip', async test => {
    const ipfs = mock()
    let kv = await DKV.empty(ipfs)
    kv = await kv.set('test', { hello: 'world' })
    same(await kv.get('test'), { hello: 'world' })
  })
}
