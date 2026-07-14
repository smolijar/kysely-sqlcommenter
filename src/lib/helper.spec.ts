import { describe, it, expect } from 'vitest'

import { sqlCommenter } from '../main'
import { testingKysely } from './modes/_test'

describe(`${sqlCommenter.name}`, () => {
  it('noop', async () => {
    const person = await db
      .selectFrom('person')
      .select(['id', 'first_name'])
      .where('id', '=', '1')
      .compile()

    expect(person).toMatchObject({
      sql: `select "id", "first_name" from "person" where "id" = $1`,
      parameters: ['1'],
    })
  })
  it('select', async () => {
    const person = await db
      .selectFrom('person')
      .select(['id', 'first_name'])
      .where('id', '=', '1')
      .$call((qb) => sqlCommenter(qb, { controller: 'person', action: 'get' }))
      .compile()

    expect(person).toMatchObject({
      sql: `select "id", "first_name" from "person" where "id" = $1 /*action='get',controller='person'*/`,
      parameters: ['1'],
    })
  })
  it('supports unquoted values', async () => {
    const person = await db
      .selectFrom('person')
      .select(['id', 'first_name'])
      .$call((qb) =>
        sqlCommenter(
          qb,
          { controller: 'person', action: 'get' },
          { quoteValues: false }
        )
      )
      .compile()

    expect(person).toMatchObject({
      sql: `select "id", "first_name" from "person" /*action=get,controller=person*/`,
      parameters: [],
    })
  })
  it('update', async () => {
    const person = await db
      .updateTable('person')
      .set({ first_name: 'foo' })
      .where('id', '=', '1')
      .$call((qb) => sqlCommenter(qb, { controller: 'person', action: 'put' }))
      .compile()

    expect(person).toMatchObject({
      sql: `update "person" set "first_name" = $1 where "id" = $2 /*action='put',controller='person'*/`,
      parameters: ['foo', '1'],
    })
  })
  it('insert', async () => {
    const person = await db
      .insertInto('person')
      .values({ first_name: 'foo', last_name: null, age: 1 })
      .$call((qb) => sqlCommenter(qb, { controller: 'person', action: 'post' }))
      .compile()

    expect(person).toMatchObject({
      sql: `insert into "person" ("first_name", "last_name", "age") values ($1, $2, $3) /*action='post',controller='person'*/`,
      parameters: ['foo', null, 1],
    })
  })
  it('delete', async () => {
    const person = await db
      .deleteFrom('person')
      .where('id', '=', '1')
      .$call((qb) =>
        sqlCommenter(qb, { controller: 'person', action: 'delete' })
      )
      .compile()

    expect(person).toMatchObject({
      sql: `delete from "person" where "id" = $1 /*action='delete',controller='person'*/`,
      parameters: ['1'],
    })
  })
  it('merge', async () => {
    const person = await db
      .mergeInto('person')
      .using('pet', 'person.id', 'pet.owner_id')
      .whenMatched()
      .thenDelete()
      .$call((qb) =>
        sqlCommenter(qb, { controller: 'person', action: 'merge' })
      )
      .compile()

    expect(person).toMatchObject({
      sql: `merge into "person" using "pet" on "person"."id" = "pet"."owner_id" when matched then delete /*action='merge',controller='person'*/`,
      parameters: [],
    })
  })
  it('skips empty comments', async () => {
    const person = await db
      .selectFrom('person')
      .select(['id', 'first_name'])
      .$call((qb) => sqlCommenter(qb, { controller: undefined }))
      .compile()

    expect(person).toMatchObject({
      sql: `select "id", "first_name" from "person"`,
      parameters: [],
    })
  })
  it('placement does not affect output', async () => {
    const queries = (
      await Promise.all(
        [
          db
            .selectFrom('person')
            .select(['id', 'first_name'])
            .where('id', '=', '1')
            .$call((qb) => sqlCommenter(qb, { controller: '1' })),
          db
            .selectFrom('person')
            .select(['id', 'first_name'])
            .$call((qb) => sqlCommenter(qb, { controller: '1' }))
            .where('id', '=', '1'),
          db
            .selectFrom('person')
            .$call((qb) => sqlCommenter(qb, { controller: '1' }))
            .select(['id', 'first_name'])
            .where('id', '=', '1'),
        ].map((q) => q.compile())
      )
    ).map((q) => q.sql)

    expect(new Set(queries).size).toBe(1)
  })
})

const db = testingKysely()
