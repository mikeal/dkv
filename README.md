# DKV (Decentralized Key-Value Store)

DKV is a decentralized graph store built on IPFS.

```js
import IPFS from 'ipfs'
import DKV from 'dkv'

const ipfs = await IPFS.create()

let store = await DKV.empty(ipfs)
store = await store.set('mykey', { hello: 'world' })

store.id // 'bafyreibbbjhk7fnxplcc6fqb24jctxffgxoqv65466gbx73n3jbqyzn3ru'
await store.get('mykey') // { hello: 'world' }
```

Every mutation (`set()`, `del()`) returns a new instance because every
mutation creates a new immutable state with a unique `id` (CID).

Since the data is accessible over IPFS it is shared in a p2p network
and other peers can access the data using the id of the store (`store.id`).

```js
let store = DKV.from(ipfs, 'bafyreibbbjhk7fnxplcc6fqb24jctxffgxoqv65466gbx73n3jbqyzn3ru')
```

## links

DKV offers a simple interface for storing key/value pairs. Values
can include links to other values recursively, giving you the
ability to create complex graphs that de-duplicate commonly
linked data.

```js
let store = await DKV.empty(ipfs)
const pizza = await store.link({ type: 'food', name: 'pizza' })
store = await store.set('bob', { type: 'person', name: 'bob', favoriteFoor: pizza })

const bob = await store.get('bob')
await bob.favoriteFood() // { type: 'food', name: 'pizza' }
```

# API

## DKV.empty(ipfs, pin=true)

## DKV.from(ipfs, cid, pin=true)

## DKV.fromEntries(ipfs, entries, pin=true)

## store.get(key)

## store.set(key, value)

## store.set(map)

## store.del(key)

## store.del(keys)
