import { describe, it, expect } from 'vitest'

import { Generated, Kysely, PostgresDialect } from 'kysely'
import { KyselySqlCommenterPlugin } from '../../main'
import { AsyncLocalStorage } from 'async_hooks'
import { SqlCommentLike } from '../comment/sqlcomment'
import { createServer, get } from 'http'

const asyncLocalStorage = new AsyncLocalStorage<SqlCommentLike>()

describe('callback', () => {
  it('async local storage in http server', async () => {
    const server = createServer((req, res) => {
      asyncLocalStorage.run({}, () => {
        const store = asyncLocalStorage.getStore()!
        store.controller = req.url ?? ''
        setImmediate(() => {
          res.end(
            db
              .selectFrom('person')
              .select(['id', 'first_name'])
              .where('id', '=', '1')
              .compile().sql
          )
        })
      })
    }).listen(8080)

    const getPath = async (path: string) => {
      const res = await new Promise<string>((resolve) => {
        let data = ''
        get(`http://localhost:8080/${path}`, (res) => {
          res.on('data', (d) => (data += d))
          res.on('end', () => resolve(data))
        })
      })
      return res
    }
    const responses = await Promise.all(
      Array.from({ length: 100 }).map((_, i) => getPath(`controller-${i}`))
    )
    responses.forEach((res, i) => {
      expect(res).toBe(
        `select "id", "first_name" from "person" where "id" = $1 /*controller='%2Fcontroller-${i}'*/`
      )
    })

    await new Promise((resolve) => server.close(resolve))
  })
})

interface DB {
  person: PersonTable
  pet: PetTable
}

interface PersonTable {
  id: Generated<string>
  first_name: string
  last_name: string | null
  created_at: Generated<Date>
  age: number
}

interface PetTable {
  id: Generated<string>
  name: string
  owner_id: string
  species: 'cat' | 'dog'
  is_favorite: boolean
}

const db = new Kysely<DB>({
  dialect: new PostgresDialect({
    pool: null as any,
  }),
  plugins: [new KyselySqlCommenterPlugin(() => asyncLocalStorage.getStore())],
})
