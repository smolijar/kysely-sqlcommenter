import {
  Expression,
  OperationNode,
  RawNode,
  RootOperationNode,
  SelectQueryBuilder,
  sql,
} from 'kysely'
import { SqlComment, SqlCommenter } from './sqlcommenter'

export class SqlCommenterFragmentExpression<T> implements Expression<T> {
  constructor(private readonly comment: SqlComment = {}) {}
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
    return JSON.parse(match) as SqlComment
  }

  static processFragments(node: RootOperationNode) {
    if (node.kind !== 'SelectQueryNode') return node
    let sqlCommenter = new SqlCommenter()
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
  comment?: SqlComment
) {
  return this.modifyEnd(new SqlCommenterFragmentExpression(comment))
}
