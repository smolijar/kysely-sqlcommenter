<div align="center">
  
![](https://i.imgur.com/V7Cwyw2.png)

# Kysely SqlCommnenter

[SqlCommenter](https://google.github.io/sqlcommenter/) plugin for [Kysely](https://kysely.dev/)

</div>

## Getting started

```bash
npm install kysely-sqlcommenter
```

SqlCommenterPlugin does not change the API of Kysely. You can only provide it callback for getting the metadata for the comment. [AsyncLocalStorage](https://nodejs.org/api/async_hooks.html#class-asynclocalstorage) or any alternative is needed.

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

Any kysely calls will have the appropriate _SqlComment_

```ts
db.selectFrom('cats').select(['id', 'name'])
// select "id", "name" from "cats" /*controller='cats'*/
```

See the full working example for express [here](./examples/express.ts), including concurrency demo and adjusting the comment in other middleware.

## Progress

- [x] Tests, examples, integration tests
- [x] SqlCommenter spec tests
- [x] Callback API + Examples with CLS
- [ ] Builder API (not really a priority with the amount of hacking needed)
- [ ] CI/CD
- [ ] Query support
  - [x] Select
  - [ ] Update
  - [ ] Insert
  - [ ] Delete
  - [ ] Misc

## References

- [SqlCommenter](https://google.github.io/sqlcommenter/)
- [Kysely](https://kysely.dev/)
- [Support for sqlcommenter? #384](https://github.com/kysely-org/kysely/issues/384)
