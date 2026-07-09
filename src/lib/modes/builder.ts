import { Expression, sql } from 'kysely'
import { SqlComment, SqlCommentLike } from '../comment/sqlcomment'

export interface SqlCommentableQueryBuilder {
  modifyEnd(modifier: Expression<any>): unknown
}

export function sqlCommenter(comment?: SqlCommentLike) {
  const sqlComment = new SqlComment(comment).serialize()
  return <QB extends SqlCommentableQueryBuilder>(qb: QB): QB => {
    if (!sqlComment) return qb
    return qb.modifyEnd(sql.raw(sqlComment)) as QB
  }
}
