import { describe, it, expect } from 'vitest'
import { SqlComment, serializeKey, serializeValue } from './sqlcomment'

describe(`${SqlComment.name}`, () => {
  // https://google.github.io/sqlcommenter/spec/
  // (but is broken as fuck)
  it('spec', () => {
    const INPUT = {
      tracestate: 'congo=t61rcWkgMzE,rojo=00f067aa0ba902b7',
      traceparent: '00-5bd66ef5095369c7b0d1f8f4bd33716a-c532cb4098ac3dd2-01',
      framework: 'spring',
      action: '/param*d',
      controller: 'index',
    }
    const OUTPUT = `/*action='%2Fparam*d',controller='index',framework='spring',traceparent='00-5bd66ef5095369c7b0d1f8f4bd33716a-c532cb4098ac3dd2-01',tracestate='congo%3Dt61rcWkgMzE%2Crojo%3D00f067aa0ba902b7'*/`
    expect(new SqlComment(INPUT).serialize()).to.equal(OUTPUT)
  })
  it('empty', () => {
    expect(new SqlComment({}).serialize()).to.equal('')
    expect(new SqlComment().serialize()).to.equal('')
    expect(undefined).to.equal('')
  })
  it('merge contains both and overrides', () => {
    expect(
      new SqlComment({})
        .merge({ a: '1', b: '1' })
        .merge({ b: '2', c: '2' })
        .serialize()
    ).to.equal(`/*a=\'1\',b=\'2\',c=\'2\'*/`)
  })
  it.todo('cannot set non-string key')
})

describe(`${serializeValue.name}`, () => {
  it('spec', () => {
    expect(serializeValue(`DROP TABLE FOO`)).to.equal(`'DROP%20TABLE%20FOO'`)
    expect(serializeValue(`/param first`)).to.equal(`'%2Fparam%20first'`)
    expect(serializeValue(`1234`)).to.equal(`'1234'`)
  })
  it('meta-chars', () => {
    expect(serializeValue(`'DROP'`)).to.equal(`'\\'DROP\\''`)
  })
})

describe(`${serializeKey.name}`, () => {
  it('spec', () => {
    expect(serializeKey(`route`)).to.equal(`route`)
    expect(serializeKey(`name''`)).to.equal(`name''`)
  })
})
