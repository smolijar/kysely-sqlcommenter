import {
  KyselyPlugin,
  PluginTransformQueryArgs,
  PluginTransformResultArgs,
  QueryResult,
  UnknownRow,
  RootOperationNode,
} from 'kysely'
import { CallbackMode, SqlCommentCallback } from './modes/callback'
import { SqlCommentSerializeOptions } from './comment/sqlcomment'

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
  constructor(
    callback: SqlCommentCallback,
    options?: SqlCommenterPluginOptions
  ) {
    this.enableCallback(callback, options)
  }

  private enableCallback(
    getComment: SqlCommentCallback,
    options?: SqlCommenterPluginOptions
  ) {
    this.#mode = new CallbackMode(getComment, options)
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

export type SqlCommenterPluginOptions = SqlCommentSerializeOptions
