import { describe, it, expect } from 'vitest'

import { Generated, Kysely, PostgresDialect } from 'kysely'
import { KyselySqlCommenterPlugin } from './main'

describe('api extension', () => {
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
  plugins: [new KyselySqlCommenterPlugin().enableApiExtension()],
})
