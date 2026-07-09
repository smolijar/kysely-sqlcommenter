export class SqlComment {
  constructor(private record: SqlCommentLike = {}) {}

  merge(record: SqlCommentLike = {}) {
    this.record = { ...this.record, ...record }
    return this
  }

  serialize() {
    const content = Object.entries(this.record)
      .filter(([, value]) => value != null)
      .map(([key, value]) => `${serializeKey(key)}=${serializeValue(String(value))}`)
      .sort()
      .join(',')
    return content ? `/*${content}*/` : ''
  }
}

export function serializeValue(value: string) {
  return `'${escapeMetaCharacters(encodeURIComponent(value))}'`
}

export function serializeKey(value: string) {
  return escapeMetaCharacters(encodeURIComponent(value))
}

export function escapeMetaCharacters(value: string) {
  return value.replace(/'/g, `\\'`)
}

export type SqlCommentValue = string | number | boolean | bigint | undefined | null

export type SqlCommentLike = {
  [key: string]: SqlCommentValue
  tracestate?: string
  traceparent?: string
  framework?: string
  action?: string
  controller?: string
}

export type MaybeSqlCommentLike = SqlCommentLike | undefined | void | null
