import { encode, decode, create } from 'multiformats/block'
import { sha256 as hasher } from 'multiformats/hashes/sha2'
import * as codec from '@ipld/dag-cbor'
import { CID } from 'multiformats'

// TODO: use HAMT instead of inline map

const linkify = (ipfs, cid) => {
  const ret = async () => ipfs.block.get(cid.toString()).then(async ({ data, cid }) => {
    return decorate(ipfs, await create({ data, cid, codec, hasher }).value)
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
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, decorate(ipfs, v)]))
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
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, prepare(v)]))
}

class DKV {
  constructor ({ ipfs, root, pin }) {
    this.ipfs = ipfs
    this.root = root
    this.pin = pin
  }

  async get (key) {
    if (typeof this.root.value[key] === 'undefined') throw new Error('Missing')
    const { data, cid } = await this.ipfs.block.get(this.root.value[key].toString())
    const opts = { bytes: data, cid: CID.parse(cid.toString()), codec, hasher }
    const block = await create(opts)
    return decorate(this.ipfs, block.value)
  }

  async set (key, value) {
    const link = await this.link(value)
    const kv = { ...this.root.value }
    kv[key] = link.cid
    const block = await encode({ value: kv, codec, hasher })
    await this.ipfs.block.put(block.bytes, { cid: block.cid.toString() })
    if (this.pin) await this.ipfs.pin(block.cid.toString(), { recursive: false })
    return new DKV({ ...this, root: block })
  }

  static async link (ipfs, value) {
    const block = await encode({ value: prepare(value), codec, hasher })
    await ipfs.block.put(block.bytes, { cid: block.cid.toString() })
    return linkify(ipfs, block.cid)
  }

  async link (value) {
    return DKV.link(this.ipfs, value)
  }

  static async from (ipfs, ref, pin = true) {
    if (typeof ref !== 'string') ref = ref.toString()
    const { data, cid } = await ipfs.block.get(ref)
    const opts = { bytes: data, cid: CID.parse(cid.toString()), codec, hasher }
    const root = await create(opts)
    return new DKV({ ipfs, root, pin })
  }

  static async fromEntries (ipfs, entries, pin = true) {
    const kv = {}
    for (let [key, value] of entries) {
      if (typeof value !== 'function') {
        value = await DKV.link(value)
      }
      kv[key] = value
    }
    const root = await DKV.link(ipfs, kv)
    return DKV.from(ipfs, root.cid, pin)
  }

  static async empty (ipfs, pin = true) {
    return DKV.fromEntries(ipfs, [], pin)
  }
}

export default DKV
