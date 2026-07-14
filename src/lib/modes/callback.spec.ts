import { describe, it, expect } from 'vitest'

import { SqlCommenterPlugin, SqlCommentLike } from '../../main'
import { AsyncLocalStorage } from 'async_hooks'
import { createServer, get } from 'http'
import { sql as rawSql } from 'kysely'
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
  it('supports unquoted values', async () => {
    const db = testingKysely(
      new SqlCommenterPlugin(
        () => ({
          controller: 'person',
          action: 'get',
        }),
        { quoteValues: false }
      )
    )
    const { sql } = db
      .selectFrom('person')
      .select(['id', 'first_name'])
      .where('id', '=', '1')
      .compile()
    expect(sql).toBe(
      `select "id", "first_name" from "person" where "id" = $1 /*action=get,controller=person*/`
    )
  })
  it('update', async () => {
    const db = testingKysely(
      new SqlCommenterPlugin(() => ({
        controller: 'person',
        action: 'put',
      }))
    )
    const { sql, parameters } = db
      .updateTable('person')
      .set({ first_name: 'foo' })
      .where('id', '=', '1')
      .compile()
    expect(sql).toBe(
      `update "person" set "first_name" = $1 where "id" = $2 /*action='put',controller='person'*/`
    )
    expect(parameters).toStrictEqual(['foo', '1'])
  })
  it('insert', async () => {
    const db = testingKysely(
      new SqlCommenterPlugin(() => ({
        controller: 'person',
        action: 'post',
      }))
    )
    const { sql, parameters } = db
      .insertInto('person')
      .values({ first_name: 'foo', last_name: null, age: 1 })
      .compile()
    expect(sql).toBe(
      `insert into "person" ("first_name", "last_name", "age") values ($1, $2, $3) /*action='post',controller='person'*/`
    )
    expect(parameters).toStrictEqual(['foo', null, 1])
  })
  it('delete', async () => {
    const db = testingKysely(
      new SqlCommenterPlugin(() => ({
        controller: 'person',
        action: 'delete',
      }))
    )
    const { sql, parameters } = db
      .deleteFrom('person')
      .where('id', '=', '1')
      .compile()
    expect(sql).toBe(
      `delete from "person" where "id" = $1 /*action='delete',controller='person'*/`
    )
    expect(parameters).toStrictEqual(['1'])
  })
  it('merge', async () => {
    const db = testingKysely(
      new SqlCommenterPlugin(() => ({
        controller: 'person',
        action: 'merge',
      }))
    )
    const { sql } = db
      .mergeInto('person')
      .using('pet', 'person.id', 'pet.owner_id')
      .whenMatched()
      .thenDelete()
      .compile()
    expect(sql).toBe(
      `merge into "person" using "pet" on "person"."id" = "pet"."owner_id" when matched then delete /*action='merge',controller='person'*/`
    )
  })
  it('skips existing end comments', async () => {
    const db = testingKysely(
      new SqlCommenterPlugin(() => ({
        controller: 'person',
      }))
    )
    const { sql } = db
      .selectFrom('person')
      .select(['id'])
      .modifyEnd(rawSql.raw('/*existing*/'))
      .compile()
    expect(sql).toBe(`select "id" from "person" /*existing*/`)
  })
  it('skips existing line comments', async () => {
    const db = testingKysely(
      new SqlCommenterPlugin(() => ({
        controller: 'person',
      }))
    )
    const { sql } = db
      .selectFrom('person')
      .select(['id'])
      .modifyEnd(rawSql.raw('-- existing'))
      .compile()
    expect(sql).toBe(`select "id" from "person" -- existing`)
  })
  it('does not treat line-comment tokens inside strings as comments', async () => {
    const db = testingKysely(
      new SqlCommenterPlugin(() => ({
        controller: 'person',
      }))
    )
    const { sql } = db
      .selectFrom('person')
      .select(['id'])
      .modifyEnd(rawSql.raw("where 'a--b' = 'a--b'"))
      .compile()
    expect(sql).toBe(
      `select "id" from "person" where 'a--b' = 'a--b' /*controller='person'*/`
    )
  })
  it('skips null comments', async () => {
    const db = testingKysely(new SqlCommenterPlugin(() => null))
    const { sql } = db
      .updateTable('person')
      .set({ first_name: 'foo' })
      .compile()
    expect(sql).toBe(`update "person" set "first_name" = $1`)
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
