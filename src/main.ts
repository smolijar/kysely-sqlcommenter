import {
  createSelectQueryBuilder,
  KyselyPlugin,
  PluginTransformQueryArgs,
  PluginTransformResultArgs,
  QueryResult,
  UnknownRow,
  sql,
  Expression,
  OperationNode,
  RawNode,
  SelectQueryBuilder,
  RootOperationNode,
} from 'kysely'
import { SqlCommenter } from './sqlcommenter'

declare module 'kysely' {
  interface SelectQueryBuilder<DB, TB extends keyof DB, O> {
    sqlCommenter(comment: SqlComment): this
  }
}

type SqlComment = {
  [key: string]: string | undefined
  tracestate?: string
  traceparent?: string
  framework?: string
  action?: string
  controller?: string
}

class SqlCommenterExpression<T> implements Expression<T> {
  constructor(private readonly comment: SqlComment = {}) {}
  get expressionType(): T | undefined {
    throw new Error('Method not implemented.')
  }
  toOperationNode(): OperationNode {
    return RawNode.create([this.encodeComment()], [])
  }

  private encodeComment() {
    return `/*sqlCommenterFragment:${JSON.stringify(this.comment)}*/`
  }

  static tryParseSqlFragment(fragment?: string) {
    if (!fragment) return null
    const [, match] = fragment.match(/\/\*sqlCommenterFragment:(.*)\*\//) ?? []
    if (!match) return null
    return JSON.parse(match) as SqlComment
  }
}

function sqlCommenter(
  this: SelectQueryBuilder<any, any, any>,
  comment?: SqlComment
) {
  return this.modifyEnd(new SqlCommenterExpression(comment))
}

export class KyselySqlCommenterPlugin implements KyselyPlugin {
  transformQuery(args: PluginTransformQueryArgs): RootOperationNode {
    const node = args.node
    let sqlCommenter = new SqlCommenter()
    const noTouchModifiers = []
    if (node.kind === 'SelectQueryNode') {
      for (const modifier of node.endModifiers ?? []) {
        const sqlFragment: string | undefined =
          // @ts-ignore
          modifier.rawModifier?.sqlFragments?.[0]
        const sqlComment =
          SqlCommenterExpression.tryParseSqlFragment(sqlFragment)
        if (sqlComment === null) {
          noTouchModifiers.push(modifier)
        } else {
          sqlCommenter.merge(sqlComment)
        }
      }
      const endModifiers = [...noTouchModifiers]
      const sqlComment = sqlCommenter.serialize()
      if (sqlComment) {
        endModifiers.push(sql`${sql.raw(sqlComment)}`.toOperationNode() as any)
      }

      return {
        ...node,
        endModifiers,
      }
    }
    return args.node
  }
  async transformResult(
    args: PluginTransformResultArgs
  ): Promise<QueryResult<UnknownRow>> {
    return args.result
  }
}

// @ts-ignore
createSelectQueryBuilder().__proto__.sqlCommenter = sqlCommenter
