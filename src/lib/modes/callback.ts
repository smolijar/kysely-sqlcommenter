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

type SqlFragmentOperationNode = OperationNode & {
  rawModifier?: OperationNode
  sqlFragments?: ReadonlyArray<string>
}

const containsSqlCommentToken = (fragment: string): boolean => {
  let quote: 'single' | 'double' | undefined

  for (let i = 0; i < fragment.length; i += 1) {
    const char = fragment[i]
    const next = fragment[i + 1]

    if (quote) {
      if (quote === 'single' && char === '\\') {
        i += 1
      } else if (quote === 'single' && char === "'" && next === "'") {
        i += 1
      } else if (
        (quote === 'single' && char === "'") ||
        (quote === 'double' && char === '"')
      ) {
        quote = undefined
      }
      continue
    }

    if (char === "'") {
      quote = 'single'
    } else if (char === '"') {
      quote = 'double'
    } else if (
      (char === '/' && next === '*') ||
      (char === '-' && next === '-')
    ) {
      return true
    }
  }

  return false
}

const containsSqlComment = (node: OperationNode): boolean => {
  const { rawModifier, sqlFragments } = node as SqlFragmentOperationNode
  // Kysely has no public API for reading end modifiers, so this checks the raw
  // node shape produced by `sql.raw`. Keep peer range pinned below new majors.
  return Boolean(
    sqlFragments?.some(containsSqlCommentToken) ||
      (rawModifier && containsSqlComment(rawModifier))
  )
}

export class CallbackMode implements SqlCommenterPluginMode {
  #getComment: SqlCommentCallback
  constructor(getComment: SqlCommentCallback) {
    this.#getComment = getComment
  }
  transformNode(node: RootOperationNode): RootOperationNode {
    if (supportsEndModifiers(node)) {
      if (node.endModifiers?.some(containsSqlComment)) return node

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
