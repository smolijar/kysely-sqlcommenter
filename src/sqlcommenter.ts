export class SqlCommenter {
  constructor(private record: Record<string, string | undefined> = {}) {}

  merge(record: Record<string, string | undefined> = {}) {
    this.record = { ...this.record, ...record }
    return this
  }

  serialize() {
    const content = Object.entries(this.record)
      .filter(
        ([key, value]) => typeof key === 'string' && typeof value === 'string'
      )
      .map(([key, value]) => `${serializeKey(key)}=${serializeValue(value!)}`)
      .sort()
      .join(',')
    return content ? `/*${content}*/` : ''
  }
}

export function serializeValue(value: string) {
  return `'${encodeURIComponent(value).replace(/'/g, `\\'`)}'`
}

export function serializeKey(value: string) {
  return encodeURIComponent(value)
}

export type SqlComment = {
  [key: string]: string | undefined
  tracestate?: string
  traceparent?: string
  framework?: string
  action?: string
  controller?: string
}
