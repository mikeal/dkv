import { encode, create } from '../js-multiformats/src/block.js'
import { sha256 as hasher } from '../js-multiformats/src/hashes/sha2.js'
import codec from '@ipld/dag-cbor'

// TODO: use HAMT instead of inline map

const linkify = (ipfs, cid) => {
  const ret = async () => ipfs.block.get(cid.toString()).then(({ data, cid }) => {
    return decorate(ipfs, create({ data, cid, codec, hasher }).value)
  })
  ret.cid = cid
  ret.toString = () => cid.toString()
  return ret
}

const decorate = (ipfs, obj) => {
  if (obj === null) return null
  if (typeof obj !== 'object') return obj
  if (Array.isArray(obj)) {
    return obj.map(x => decorate(ipfs, x))
  }
  if (obj.asCID === obj) {
  }
  return Object.fromEntries(Object.entries(obj).map((k, v) => [k, decorate(ipfs, v)]))
}

const prepare = obj => {
  if (obj === null) return null
  if (typeof obj !== 'object') return obj
  if (typeof obj === 'function') {
    if (!obj.cid) throw new Error('Cannot serialize functions that are not links')
    return obj.cid
  }
  if (Array.isArray(obj)) {
    return obj.map(x => prepare(x))
  }
  if (obj.asCID === obj) {
    return obj
  }
  return Object.fromEntries(Object.entries(obj).map((k, v) => [k, prepare(v)]))
}

class DKV {
  constructor ({ ipfs, root, pin }) {
    this.ipfs = ipfs
    this.root = root
    this.pin = pin
  }

  async get (key) {
    if (typeof this.root.value[key] === 'undefined') throw new Error('Missing')
    const { data, cid } = await this.ipfs.block.get(this.root.value[key])
    const block = await create({ bytes: data, cid, hasher })
    return decorate(this.ipfs, block.value)
  }

  async set (key, value) {
    const link = await this.link(value)
    const kv = { ...this.root.value }
    kv[key] = link.cid
    const block = encode({ value: kv, codec, hasher })
    await this.ipfs.block.put(block.bytes, { cid: block.cid.toString() })
    if (this.pin) await this.ipfs.pin(block.cid.toString(), { recursive: false })
    return new DKV({ ...this, root: block })
  }

  async link (value) {
    const block = encode({ value: prepare(value), codec, hasher })
    await this.ipfs.block.put(block.bytes, { cid: block.cid.toString() })
    return linkify(this.ipfs, block.cid)
  }

  static async from (ipfs, ref, pin = true) {
    if (typeof ref !== 'string') ref = ref.toString()
    const { data, cid } = await this.ipfs.block.get(ref)
    const root = await create({ bytes: data, cid, codec, hasher })
    return new DKV({ ipfs, root, pin })
  }
}

export default DKV
