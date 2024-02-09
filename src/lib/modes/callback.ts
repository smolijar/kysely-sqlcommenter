import { RootOperationNode, sql } from 'kysely'
import { SqlComment, SqlCommentLike } from '../comment/sqlcomment'
import { KyselySqlCommenterPluginMode } from '../plugin'

export type SqlCommentCallback = () => SqlCommentLike

export class CallbackMode implements KyselySqlCommenterPluginMode {
  #getComment: SqlCommentCallback
  constructor(getComment: SqlCommentCallback) {
    this.#getComment = getComment
  }
  transformNode(node: RootOperationNode): RootOperationNode {
    if (node.kind === 'SelectQueryNode') {
      const sqlComment = new SqlComment(this.#getComment()).serialize()
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
    return node
  }
}
