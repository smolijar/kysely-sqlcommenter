import { describe, it, expect } from 'vitest'

import { SqlCommenterPlugin, SqlCommentLike } from '../../main'
import { AsyncLocalStorage } from 'async_hooks'
import { createServer, get } from 'http'
import type { AddressInfo } from 'net'
import { testingKysely } from './_test'

describe('callback', () => {
  it('noop', async () => {
    const db = testingKysely(new SqlCommenterPlugin(() => {}))
    const { sql, parameters } = db
      .selectFrom('person')
      .select(['id', 'first_name'])
      .where('id', '=', '1')
      .compile()
    expect(sql).toBe(`select "id", "first_name" from "person" where "id" = $1`)
    expect(parameters).toStrictEqual(['1'])
  })
  it('select', async () => {
    const db = testingKysely(
      new SqlCommenterPlugin(() => ({
        controller: 'person',
        action: 'get',
      }))
    )
    const { sql } = db
      .selectFrom('person')
      .select(['id', 'first_name'])
      .where('id', '=', '1')
      .compile()
    expect(sql).toBe(
      `select "id", "first_name" from "person" where "id" = $1 /*action='get',controller='person'*/`
    )
  })
  it.skip('update', async () => {
    // if (node.kind === 'UpdateQueryNode') {
    //   const sqlComment = new SqlComment(
    //     this.#getComment() ?? undefined
    //   ).serialize()
    //   if (sqlComment) {
    //     const returning = {
    //       ...(node.returning ?? {
    //         kind: 'ReturningNode',
    //         selections: [],
    //       }),
    //     }
    //     return {
    //       ...node,
    //       returning: {
    //         ...returning,
    //         selections: [
    //           ...returning.selections,
    //           sql`${sql.raw(sqlComment)}`.toOperationNode() as any,
    //         ],
    //       },
    //     }
    //   }
    // }
    const db = testingKysely(
      new SqlCommenterPlugin(() => ({
        controller: 'person',
        action: 'put',
      }))
    )
    const { sql } = db
      .updateTable('person')
      .set({ first_name: 'foo' })
      .compile()
    expect(sql).toBe(
      `update "person" set "first_name" = $1 /*action='put',controller='person'*/`
    )
  })
  it('async local storage in http server', async () => {
    const asyncLocalStorage = new AsyncLocalStorage<SqlCommentLike>()
    const db = testingKysely(
      new SqlCommenterPlugin(() => asyncLocalStorage.getStore())
    )

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
    })

    await new Promise<void>((resolve) => server.listen(0, resolve))
    const { port } = server.address() as AddressInfo

    const getPath = async (path: string) => {
      const res = await new Promise<string>((resolve) => {
        let data = ''
        get(`http://127.0.0.1:${port}/${path}`, (res) => {
          res.on('data', (d) => (data += d))
          res.on('end', () => resolve(data))
        })
      })
      return res
    }

    try {
      const responses = await Promise.all(
        Array.from({ length: 100 }).map((_, i) => getPath(`controller-${i}`))
      )
      responses.forEach((res, i) => {
        expect(res).toBe(
          `select "id", "first_name" from "person" where "id" = $1 /*controller='%2Fcontroller-${i}'*/`
        )
      })
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()))
      })
    }
  })
})
