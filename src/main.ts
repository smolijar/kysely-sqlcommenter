export type { SqlCommentCallback } from './lib/modes/callback'

export {
  SqlComment,
  type SqlCommentLike,
  type SqlCommentSerializeOptions,
} from './lib/comment/sqlcomment'
export { sqlCommenter } from './lib/helper'
export type { SqlCommentableQueryBuilder } from './lib/helper'
export { SqlCommenterPlugin } from './lib/plugin'
export type { SqlCommenterPluginOptions } from './lib/plugin'
