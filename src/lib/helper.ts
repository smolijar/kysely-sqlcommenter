import { sql } from 'kysely'
import type { Expression } from 'kysely'
import {
  SqlComment,
  SqlCommentLike,
  SqlCommentSerializeOptions,
} from './comment/sqlcomment'

export interface SqlCommentableQueryBuilder {
  modifyEnd(modifier: Expression<any>): unknown
}

export function sqlCommenter<QB extends SqlCommentableQueryBuilder>(
  qb: QB,
  comment?: SqlCommentLike,
  options?: SqlCommentSerializeOptions
): QB {
  const sqlComment = new SqlComment(comment, options).serialize()
  if (!sqlComment) return qb
  return qb.modifyEnd(sql.raw(sqlComment)) as QB
}
