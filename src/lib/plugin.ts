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

export interface KyselySqlCommenterPluginMode {
  transformNode(node: RootOperationNode): RootOperationNode
}

export class KyselySqlCommenterPlugin implements KyselyPlugin {
  #mode?: KyselySqlCommenterPluginMode

  /**
   * TODO: Examples
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
