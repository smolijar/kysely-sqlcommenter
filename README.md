<div align="center">
  
![](https://i.imgur.com/V7Cwyw2.png)

# Kysely SqlCommenter

[SqlCommenter](https://google.github.io/sqlcommenter/) plugin for [Kysely](https://kysely.dev/)

</div>

## Getting started

```bash
npm install kysely-sqlcommenter
```

Requires Kysely `>=0.28.17 <0.30.0`.

SqlCommenterPlugin does not change the API of Kysely. You only provide it a callback for getting the metadata for the comment. [AsyncLocalStorage](https://nodejs.org/api/async_hooks.html#class-asynclocalstorage) or any alternative is needed.

Initialize the `AsyncLocalStorage`:

```ts
import { AsyncLocalStorage } from 'node:async_hooks'
import { SqlCommentLike } from 'kysely-sqlcommenter'

const asyncLocalStorage = new AsyncLocalStorage<SqlCommentLike>()
```

Register the `SqlCommenterPlugin` using the `asyncLocalStorage` in callback:

```ts
import { SqlCommenterPlugin } from 'kysely-sqlcommenter'

const db = new Kysely<DB>({
  // ... kysely config
  plugins: [
    // Provide callback
    new SqlCommenterPlugin(() => asyncLocalStorage.getStore()),
  ],
})
```

Create a root middleware, register the root span with storage via `asyncLocalStorage.run`. Everything in the callstack of this `next` will have access to a shared copy of the storage (new calls will have exclusive storage). You can initialize it with a value.

```ts
app.use((req, res, next) => {
  asyncLocalStorage.run({ controller: req.path }, next)
})
```

Any supported DML query will have the appropriate _SqlComment_. Supported query types: select, update, insert, delete, and merge.

```ts
db.selectFrom('cats').select(['id', 'name'])
// select "id", "name" from "cats" /*controller='cats'*/
```

For explicit per-query comments, use Kysely's `$call` helper API:

```ts
import { sqlCommenter } from 'kysely-sqlcommenter'

db.selectFrom('cats')
  .$call((qb) => sqlCommenter(qb, { controller: 'cats', action: 'list' }))
  .select(['id', 'name'])
// select "id", "name" from "cats" /*action='list',controller='cats'*/
```

See the full working example for express [here](./examples/express.ts), including concurrency demo and adjusting the comment in other middleware.

## Progress

- [x] Tests, examples, integration tests
- [x] SqlCommenter spec tests
- [x] Callback API + Examples with CLS
- [x] Builder helper API via Kysely `$call`
- [x] CI
- [x] Query support (assume only DML, other are not useful)
  - [x] Select
  - [x] Update
  - [x] Insert
  - [x] Delete

## References

- [SqlCommenter](https://google.github.io/sqlcommenter/)
- [Kysely](https://kysely.dev/)
- [Support for sqlcommenter? #384](https://github.com/kysely-org/kysely/issues/384)
