import assert from 'assert'
import { AsyncLocalStorage } from 'async_hooks'
import express from 'express'
import { Generated, Kysely, PostgresDialect } from 'kysely'
import { SqlCommenterPlugin, SqlCommentLike } from 'kysely-sqlcommenter'

const app = express()
const port = 3000
const asyncLocalStorage = new AsyncLocalStorage<SqlCommentLike>()

interface DB {
  cats: {
    id: Generated<string>
    name: string
  }
}

const db = new Kysely<DB>({
  dialect: new PostgresDialect({
    pool: {
      /*TODO*/
    } as any,
  }),
  plugins: [new SqlCommenterPlugin(() => asyncLocalStorage.getStore())],
})

// Start CLS context with root span using `run`
app.use((req, res, next) => {
  asyncLocalStorage.run({}, next)
})

// Some middleware along the way continuously sets to context
app.use((req, res, next) => {
  const store = asyncLocalStorage.getStore()
  assert(store)
  store.action = req.method
  store.controller = req.path.replace(/^\//, '')
  store.tracestate = `id-${req.query.id}`
  next()
})

// Use kysely anywhere in the app
app.all('/cats', (req, res) => {
  res.status(200).send(
    db
      .selectFrom('cats')
      .select(['id', 'name'])
      .where('id', '=', String(req.query.id ?? '1'))
      .compile().sql
  )
})

const server = app.listen(port, async () => {
  const urls = Array(10)
    .fill(0)
    .map((_, i) => `http://localhost:${port}/cats?id=${i}`)

  await Promise.all(
    urls.map(async (url) => {
      console.log(`--> ${url}`)
      const res = await fetch(url)
      console.log(`<-- ${await res.text()} (original url: ${url})`)
    })
  )
  server.close()
})
