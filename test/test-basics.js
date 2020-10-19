import DKV from '../index.js'
import { deepStrictEqual as same } from 'assert'
import ipfsModule from 'ipfs'
import Ctl from 'ipfsd-ctl'

/* terrible hack until we can get a better ipfs instance for testing
setTimeout(() => {
  process.exit()
}, 1000 * 3)
*/

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

export default async test => {
  test('put/get roundtrip', async test => {
    const ipfs = await setup(test)
    let kv = await DKV.empty(ipfs)
    kv = await kv.set('test', { hello: 'world' })
    same(await kv.get('test'), { hello: 'world' })
    ipfs.stop()
  })
  test('put/get roundtrip', async test => {
    const ipfs = await setup(test)
    let kv = await DKV.empty(ipfs)
    kv = await kv.set('test', { hello: 'world' })
    same(await kv.get('test'), { hello: 'world' })
    ipfs.stop()
  })
}
