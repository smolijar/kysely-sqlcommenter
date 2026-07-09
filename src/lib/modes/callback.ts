import { RootOperationNode, sql } from 'kysely'
import { MaybeSqlCommentLike, SqlComment } from '../comment/sqlcomment'
import { SqlCommenterPluginMode } from '../plugin'

export type SqlCommentCallback = () => MaybeSqlCommentLike

const append = <T>(xs: undefined | readonly T[], x: T) =>
  xs ? [...xs, x] : [x]

export class CallbackMode implements SqlCommenterPluginMode {
  #getComment: SqlCommentCallback
  constructor(getComment: SqlCommentCallback) {
    this.#getComment = getComment
  }
  transformNode(node: RootOperationNode): RootOperationNode {
    if (node.kind === 'SelectQueryNode') {
      const sqlComment = new SqlComment(
        this.#getComment() ?? undefined
      ).serialize()
      if (sqlComment) {
        return {
          ...node,
          endModifiers: append(
            node.endModifiers,
            sql`${sql.raw(sqlComment)}`.toOperationNode() as any
          ),
        }
      }
    }
    return node
  }
}
