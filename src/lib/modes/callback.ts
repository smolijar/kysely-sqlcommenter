import { OperationNode, RootOperationNode, sql } from 'kysely'
import { MaybeSqlCommentLike, SqlComment } from '../comment/sqlcomment'
import { SqlCommenterPluginMode } from '../plugin'

export type SqlCommentCallback = () => MaybeSqlCommentLike

const append = <T>(xs: undefined | readonly T[], x: T) =>
  xs ? [...xs, x] : [x]

type SqlCommentableOperationNode = RootOperationNode & {
  kind:
    | 'SelectQueryNode'
    | 'InsertQueryNode'
    | 'UpdateQueryNode'
    | 'DeleteQueryNode'
    | 'MergeQueryNode'
  endModifiers?: ReadonlyArray<OperationNode>
}

const supportsEndModifiers = (
  node: RootOperationNode
): node is SqlCommentableOperationNode =>
  node.kind === 'SelectQueryNode' ||
  node.kind === 'InsertQueryNode' ||
  node.kind === 'UpdateQueryNode' ||
  node.kind === 'DeleteQueryNode' ||
  node.kind === 'MergeQueryNode'

export class CallbackMode implements SqlCommenterPluginMode {
  #getComment: SqlCommentCallback
  constructor(getComment: SqlCommentCallback) {
    this.#getComment = getComment
  }
  transformNode(node: RootOperationNode): RootOperationNode {
    if (supportsEndModifiers(node)) {
      const sqlComment = new SqlComment(
        this.#getComment() ?? undefined
      ).serialize()
      if (!sqlComment) return node

      return {
        ...node,
        endModifiers: append(
          node.endModifiers,
          sql`${sql.raw(sqlComment)}`.toOperationNode()
        ),
      } as RootOperationNode
    }
    return node
  }
}
