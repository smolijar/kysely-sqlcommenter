import { sql } from 'kysely'
import type { Expression } from 'kysely'
import { SqlComment, SqlCommentLike } from './comment/sqlcomment'

export interface SqlCommentableQueryBuilder {
  modifyEnd(modifier: Expression<any>): unknown
}

export function sqlCommenter<QB extends SqlCommentableQueryBuilder>(
  qb: QB,
  comment?: SqlCommentLike
): QB {
  const sqlComment = new SqlComment(comment).serialize()
  if (!sqlComment) return qb
  return qb.modifyEnd(sql.raw(sqlComment)) as QB
}
