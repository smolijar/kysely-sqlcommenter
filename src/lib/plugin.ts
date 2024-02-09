import {
  KyselyPlugin,
  PluginTransformQueryArgs,
  PluginTransformResultArgs,
  QueryResult,
  UnknownRow,
  RootOperationNode,
} from 'kysely'
import { SqlCommentLike } from './comment/sqlcomment'
import { BuilderMode } from './modes/builder'
import { CallbackMode, SqlCommentCallback } from './modes/callback'

export interface KyselySqlCommenterPluginMode {
  transformNode(node: RootOperationNode): RootOperationNode
}

export class KyselySqlCommenterPlugin implements KyselyPlugin {
  #mode?: KyselySqlCommenterPluginMode

  enableBuilder() {
    this.#mode = new BuilderMode()
    return this
  }

  enableCallback(getComment: SqlCommentCallback) {
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

// Patch SelectQueryBuilder types (see https://kysely.dev/docs/recipes/extending-kysely#extending-using-module-augmentation)
// Currently, not part of bundle due to `rollupTypes`
declare module 'kysely' {
  interface SelectQueryBuilder<DB, TB extends keyof DB, O> {
    sqlCommenter(comment: SqlCommentLike): this
  }
}
