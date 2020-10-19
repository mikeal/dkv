import DKV from '../index.js'
import { deepStrictEqual as same } from 'assert'
import ipfsModule from 'ipfs'
import Ctl from 'ipfsd-ctl'
import { CID } from 'multiformats'

const createIPFS = () => Ctl.createController({
  type: 'proc',
  ipfsModule,
  test: true,
  disposable: true
})

const setup = async test => {
  const ipfsd = await createIPFS()
  test.after(() => ipfsd.stop())
  return ipfsd.api
}

const testError = async (fn, props) => {
  let threw = true
  try {
    await fn()
    threw = false
  } catch (e) {
    for (const [key, value] of Object.entries(props)) {
      same(e[key], value)
    }
  }
  same(threw, true)
}

export default async test => {
  test('put/get roundtrip', async test => {
    const ipfs = await setup(test)
    let kv = await DKV.empty(ipfs)
    kv = await kv.set('test', { hello: 'world' })
    same(await kv.get('test'), { hello: 'world' })
  })
  test('del', async test => {
    const ipfs = await setup(test)
    let kv = await DKV.empty(ipfs)
    kv = await kv.set({ test: { hello: 'world' }, 'test-del': 3 })
    same(await kv.get('test'), { hello: 'world' })
    same(await kv.get('test-del'), 3)
    kv = await kv.del('test-del')
    same(await kv.get('test'), { hello: 'world' })
    testError(() => kv.get('test-del'), { message: 'Key not found: "test-del"' })
    kv = await kv.del(['test'])
    testError(() => kv.get('test'), { message: 'Key not found: "test"' })
  })
  test('from', async test => {
    const ipfs = await setup(test)
    let kv = await DKV.fromEntries(ipfs, [['test', { hello: 'world' }]])
    kv = await DKV.from(ipfs, kv.id)
    same(await kv.get('test'), { hello: 'world' })
    kv = await DKV.from(ipfs, CID.parse(kv.id))
    same(await kv.get('test'), { hello: 'world' })
  })
  test('links', async test => {
    const ipfs = await setup(test)
    let kv = await DKV.empty(ipfs)
    kv = await kv.set('test', { l: await kv.link({ hello: 'world' }) })
    let doc = await kv.get('test')
    let hw = await doc.l()
    same(hw, { hello: 'world' })
    kv = await kv.set('relink', doc)
    doc = await kv.get('relink')
    hw = await doc.l()
    same(hw, { hello: 'world' })
  })
}
