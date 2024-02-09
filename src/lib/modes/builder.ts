import {
  Expression,
  OperationNode,
  RawNode,
  RootOperationNode,
  SelectQueryBuilder,
  createSelectQueryBuilder,
  sql,
} from 'kysely'
import { SqlCommentLike, SqlComment } from '../comment/sqlcomment'
import { KyselySqlCommenterPluginMode } from '../plugin'

export class SqlCommenterFragmentExpression<T> implements Expression<T> {
  constructor(private readonly comment: SqlCommentLike = {}) {}
  get expressionType(): T | undefined {
    return undefined
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
    return JSON.parse(match) as SqlCommentLike
  }

  static processFragments(
    node: RootOperationNode
  ): any /*exported inferred type*/ {
    if (node.kind !== 'SelectQueryNode') return node
    let sqlCommenter = new SqlComment()
    const noTouchModifiers = []
    for (const modifier of node.endModifiers ?? []) {
      const sqlFragment: string | undefined =
        // @ts-ignore
        modifier.rawModifier?.sqlFragments?.[0]
      const sqlComment =
        SqlCommenterFragmentExpression.tryParseSqlFragment(sqlFragment)
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
}

export function sqlCommenter(
  this: SelectQueryBuilder<any, any, any>,
  comment?: SqlCommentLike
) {
  return this.modifyEnd(new SqlCommenterFragmentExpression(comment))
}

export class BuilderMode implements KyselySqlCommenterPluginMode {
  constructor() {
    // Class not exported, see https://github.com/kysely-org/kysely/pull/721#issuecomment-1745328785
    const createSelectQueryBuilderInstance = createSelectQueryBuilder
    // @ts-ignore: Patch SelectQueryBuilder
    createSelectQueryBuilderInstance().__proto__.sqlCommenter = sqlCommenter
  }
  transformNode(node: RootOperationNode): RootOperationNode {
    return SqlCommenterFragmentExpression.processFragments(node)
  }
}
