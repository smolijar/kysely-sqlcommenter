import { Generated, Kysely, KyselyPlugin, PostgresDialect } from 'kysely'

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

export const testingKysely = (plugin: KyselyPlugin) =>
  new Kysely<DB>({
    dialect: new PostgresDialect({
      pool: null as any,
    }),
    plugins: [plugin],
  })
