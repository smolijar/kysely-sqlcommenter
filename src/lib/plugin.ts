import {
  KyselyPlugin,
  PluginTransformQueryArgs,
  PluginTransformResultArgs,
  QueryResult,
  UnknownRow,
  RootOperationNode,
} from 'kysely'
import { BuilderMode } from './modes/builder'
import { CallbackMode, SqlCommentCallback } from './modes/callback'

export interface SqlCommenterPluginMode {
  transformNode(node: RootOperationNode): RootOperationNode
}

export class SqlCommenterPlugin implements KyselyPlugin {
  #mode?: SqlCommenterPluginMode

  /**
   * ## Examples
   * ### Express + AsyncLocalStorage
   * ```ts
   * import { AsyncLocalStorage } from 'async_hooks'
   * import { Kysely } from 'kysely'
   * import { SqlCommenterPlugin, SqlCommentLike } from 'kysely-sqlcommenter'
   *
   * const asyncLocalStorage = new AsyncLocalStorage<SqlCommentLike>()
   *
   * const db = new Kysely<DB>({
   *   // Pass async local storage callback to the plugin
   *   plugins: [new SqlCommenterPlugin(() => asyncLocalStorage.getStore())],
   * })
   *
   * app.use((req, res, next) => {
   *   // Initialize storage
   *   asyncLocalStorage.run({ controller: req.path.replace(/^\//, '') }, next)
   * })
   *
   *
   * db.selectFrom('cats').select(['id', 'name'])
   * // select "id", "name" from "cats" /*controller='cats'* /
   * ```
   */
  constructor(callback: SqlCommentCallback) {
    this.enableCallback(callback)
  }

  /**
   * @deprecated Experimental feature uses prototype patching and TypeScript module augmentation.
   * Also is overly complex and probably not worth it at this point. Fails integration tests (when
   * installed as module). Might be fixed or removed in the future.
   */
  enableBuilder() {
    this.#mode = new BuilderMode()
    return this
  }

  private enableCallback(getComment: SqlCommentCallback) {
    this.#mode = new CallbackMode(getComment)
    return this
  }

  transformQuery({ node }: PluginTransformQueryArgs): RootOperationNode {
    if (this.#mode) return this.#mode.transformNode(node)
    return node
  }
  async transformResult(
    args: PluginTransformResultArgs
  ): Promise<QueryResult<UnknownRow>> {
    return args.result
  }
}
