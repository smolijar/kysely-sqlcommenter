import {
  createSelectQueryBuilder,
  KyselyPlugin,
  PluginTransformQueryArgs,
  PluginTransformResultArgs,
  QueryResult,
  UnknownRow,
  RootOperationNode,
  sql,
} from 'kysely'
import { SqlComment, SqlCommenter } from './sqlcommenter'
import { SqlCommenterFragmentExpression, sqlCommenter } from './api-extension'

export class KyselySqlCommenterPlugin implements KyselyPlugin {
  #apiExtensionEnabled = false
  #getComment: undefined | (() => SqlComment)

  enableApiExtension() {
    this.#apiExtensionEnabled = true
    // Class not exported, see https://github.com/kysely-org/kysely/pull/721#issuecomment-1745328785
    // @ts-ignore: Patch SelectQueryBuilder
    createSelectQueryBuilder().__proto__.sqlCommenter = sqlCommenter
    return this
  }

  enableALC(getComment: () => SqlComment) {
    this.#getComment = getComment
    return this
  }

  transformQuery({ node }: PluginTransformQueryArgs): RootOperationNode {
    if (this.#getComment && node.kind === 'SelectQueryNode') {
      const sqlComment = new SqlCommenter(this.#getComment()).serialize()
      if (sqlComment) {
        return {
          ...node,
          endModifiers: [
            ...(node.endModifiers ?? []),
            sql`${sql.raw(sqlComment)}`.toOperationNode() as any,
          ],
        }
      }
    }
    if (this.#apiExtensionEnabled) {
      return SqlCommenterFragmentExpression.processFragments(node)
    }
    return node
  }
  async transformResult(
    args: PluginTransformResultArgs
  ): Promise<QueryResult<UnknownRow>> {
    return args.result
  }
}

// Patch SelectQueryBuilder types (see https://kysely.dev/docs/recipes/extending-kysely#extending-using-module-augmentation)
declare module 'kysely' {
  interface SelectQueryBuilder<DB, TB extends keyof DB, O> {
    sqlCommenter(comment: SqlComment): this
  }
}
