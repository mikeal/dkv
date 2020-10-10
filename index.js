import { encode, create } from 'multiformats/block'
import { sha256 as hasher } from 'multiformats/hashes/sha2'
import * as codec from '@ipld/dag-cbor'
import { CID } from 'multiformats'
import mkhamt from 'hamt-utils'

const hamt = mkhamt({ codec, hasher })

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
    return linkify(ipfs, obj)
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
    if (!ipfs) throw new Error('Missing required argument "ipfs"')
    if (!root || root.asCID !== root) throw new Error('Missing required argument "root"')
    this.ipfs = ipfs
    this.root = root
    this.pin = pin
    this._getBlock = async cid => {
      const { data } = await ipfs.block.get(cid.toString())
      return create({ bytes: data, cid, codec, hasher })
    }
    this._putBlock = async block => {
      const opts = { cid: block.cid.toString() }
      await ipfs.block.put(block.bytes, opts)
      return true
    }
  }

  async get (key) {
    const cid = await hamt.get(this.root, key, this._getBlock)
    if (typeof cid === 'undefined') throw new Error(`Key not found: "${key}"`)
    const block = await this._getBlock(cid)
    return decorate(this.ipfs, block.value)
  }

  async _bulk (ops) {
    const promises = []
    let last
    for await (const block of hamt.bulk(this.root, ops, this._getBlock)) {
      promises.push(this._putBlock(block))
      last = block
    }
    await Promise.all(promises)
    // if (this.pin) await this.ipfs.pin.add(last.cid.toString())
    return new DKV({ root: last.cid, ipfs: this.ipfs, pin: this.pin })
  }

  async set (key, val) {
    let ops
    if (typeof key === 'object') {
      const values = await Promise.all(Object.values(key).map(val => this.link(val)))
      ops = Object.entries(key).map(key => ({ set: { key, val: values.shift().cid } }))
    } else {
      val = (await this.link(val)).cid
      ops = [{ set: { key, val } }]
    }
    return this._bulk(ops)
  }

  async del (key) {
    return this._bulk([{ del: { key } }])
  }

  static async link (ipfs, value) {
    const block = await encode({ value: prepare(value), codec, hasher })
    await ipfs.block.put(block.bytes, { cid: block.cid.toString() })
    return linkify(ipfs, block.cid)
  }

  async link (value) {
    if (typeof link === 'function') {
      if (!value.cid) throw new Error('Cannot serialize function')
      return value
    }
    if (value && value.asCID === value) return linkify(this.ipfs, value)
    return DKV.link(this.ipfs, value)
  }

  static async from (ipfs, ref, pin = true) {
    if (typeof ref !== 'string') ref = ref.toString()
    const { data, cid } = await ipfs.block.get(ref)
    const opts = { bytes: data, cid: CID.parse(cid.toString()), codec, hasher }
    const block = await create(opts)
    return new DKV({ ipfs, root: block.cid, pin })
  }

  static async fromEntries (ipfs, entries, pin = true) {
    const db = await DKV.empty(ipfs, false)
    return db.set(Object.fromEntries(entries))
  }

  static async empty (ipfs, pin = true) {
    const block = await hamt.empty()
    await ipfs.block.put(block.bytes, { cid: block.cid.toString() })
    return new DKV({ ipfs, root: block.cid, pin })
  }

  get id () {
    return this.root.cid.toString()
  }

  [Symbol.for('nodejs.util.inspect.custom')] () {
    return 'DKV(' + this.id + ')'
  }
}

export default DKV
