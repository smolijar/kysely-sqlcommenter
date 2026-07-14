export class SqlComment {
  constructor(
    private record: SqlCommentLike = {},
    private options: SqlCommentSerializeOptions = {}
  ) {}

  merge(record: SqlCommentLike = {}) {
    this.record = { ...this.record, ...record }
    return this
  }

  serialize() {
    const content = Object.entries(this.record)
      .filter(([, value]) => value != null)
      .map(
        ([key, value]) =>
          `${serializeKey(key)}=${serializeValue(String(value), this.options)}`
      )
      .sort()
      .join(',')
    return content ? `/*${content}*/` : ''
  }
}

export function serializeValue(
  value: string,
  options: SqlCommentSerializeOptions = {}
) {
  const serialized = escapeMetaCharacters(encodeURIComponent(value))
  return options.quoteValues === false ? serialized : `'${serialized}'`
}

export function serializeKey(value: string) {
  return escapeMetaCharacters(encodeURIComponent(value))
}

export function escapeMetaCharacters(value: string) {
  return value.replace(/'/g, `\\'`)
}

export type SqlCommentValue = string | number | boolean | bigint | undefined | null

export interface SqlCommentSerializeOptions {
  /**
   * Sqlcommenter spec wraps values in single quotes. Disable only for tools that
   * display those delimiters as part of the tag value, such as Cloud SQL.
   */
  quoteValues?: boolean
}

export type SqlCommentLike = {
  [key: string]: SqlCommentValue
  tracestate?: string
  traceparent?: string
  framework?: string
  action?: string
  controller?: string
}

export type MaybeSqlCommentLike = SqlCommentLike | undefined | void | null
