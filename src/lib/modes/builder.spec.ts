import { describe, it, expect } from 'vitest'

import { KyselySqlCommenterPlugin } from '../../main'
import { testingKysely } from './_test'

describe('builder', () => {
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
      .sqlCommenter({ controller: 'person', action: 'get' })
      .compile()

    expect(person).toMatchObject({
      sql: `select "id", "first_name" from "person" where "id" = $1 /*action='get',controller='person'*/`,
      parameters: ['1'],
    })
  })
  it('merging comments', async () => {
    const person = await db
      .selectFrom('person')
      .sqlCommenter({ controller: 'person' })
      .select(['id', 'first_name'])
      .where('id', '=', '1')
      .sqlCommenter({ action: 'get' })
      .compile()

    expect(person).toMatchObject({
      sql: `select "id", "first_name" from "person" where "id" = $1 /*action='get',controller='person'*/`,
      parameters: ['1'],
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
            .sqlCommenter({ controller: '1' }),
          db
            .selectFrom('person')
            .select(['id', 'first_name'])
            .sqlCommenter({ controller: '1' })
            .where('id', '=', '1'),
          db
            .selectFrom('person')
            .sqlCommenter({ controller: '1' })
            .select(['id', 'first_name'])
            .where('id', '=', '1'),
        ].map((q) => q.compile())
      )
    ).map((q) => q.sql)

    expect(new Set(queries).size).toBe(1)
  })
})

const db = testingKysely(new KyselySqlCommenterPlugin(() => {}).enableBuilder())
