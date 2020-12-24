import path from 'path'
import { Router } from '../router'
import { Response } from '../response'
import { Nullable, Strict, Union, Literal, JsonType, Int, Float } from 'farrow-schema'
import { Stream } from 'stream'

describe('Router', () => {
  it('should validating pathname & method', async () => {
    let router = Router()
    let schema = {
      pathname: '/test',
    }

    router.match(schema).use(async (request) => {
      return Response.json(request)
    })

    expect(async () => {
      await router.run({
        pathname: '/abc',
      })
    }).rejects.toThrow()

    let result = await router.run({
      pathname: '/test',
    })

    expect(result.info.body).toEqual({
      type: 'json',
      value: {
        pathname: '/test',
      },
    })
  })

  it('should validating method & params & query & body & headers & cookies', async () => {
    let router = Router()

    let schema = {
      pathname: '/detail/:id',
      method: 'POST',
      params: {
        id: Number,
      },
      query: {
        a: Number,
        b: String,
        c: Boolean,
      },
      body: Nullable({
        a: Number,
        b: String,
        c: Boolean,
        d: {
          a: Number,
          b: String,
          c: Boolean,
        },
      }),
      headers: {
        a: Number,
        b: String,
        c: Boolean,
      },
      cookies: {
        a: Number,
        b: String,
        c: Boolean,
      },
    }

    router.match(schema).use(async (request) => {
      return Response.json(request)
    })

    expect(async () => {
      await router.run({
        pathname: '/detail/abc',
      })
    }).rejects.toThrow()

    let request0 = {
      pathname: '/detail/123',
      method: 'POST',
      params: {
        id: 123,
      },
      query: {
        a: '1',
        b: '1',
        c: 'false',
      },
      body: null,
      headers: {
        a: '1',
        b: '1',
        c: 'false',
      },
      cookies: {
        a: '1',
        b: '1',
        c: 'false',
      },
    }

    let result0 = await router.run(request0)

    expect(result0.info.body).toEqual({
      type: 'json',
      value: {
        pathname: '/detail/123',
        method: 'POST',
        params: {
          id: 123,
        },
        query: {
          a: 1,
          b: '1',
          c: false,
        },
        body: null,
        headers: {
          a: 1,
          b: '1',
          c: false,
        },
        cookies: {
          a: 1,
          b: '1',
          c: false,
        },
      },
    })

    let request1 = {
      ...request0,
      body: {
        a: 1,
        b: '1',
        c: false,
        d: {
          a: 1,
          b: '1',
          c: false,
        },
      },
    }

    let result1 = await router.run(request1)

    expect(result1.info.body).toEqual({
      type: 'json',
      value: {
        pathname: '/detail/123',
        method: 'POST',
        params: {
          id: 123,
        },
        query: {
          a: 1,
          b: '1',
          c: false,
        },
        body: {
          a: 1,
          b: '1',
          c: false,
          d: {
            a: 1,
            b: '1',
            c: false,
          },
        },
        headers: {
          a: 1,
          b: '1',
          c: false,
        },
        cookies: {
          a: 1,
          b: '1',
          c: false,
        },
      },
    })

    let request2 = {
      ...request1,
      query: {},
    }

    expect(async () => {
      await router.run(request2)
    }).rejects.toThrow()
  })

  it('can validate number | int | float | boolean strictly', async () => {
    let router0 = Router()

    let router1 = Router()

    router0
      .match({
        pathname: '/',
        query: {
          id: Strict(Number),
        },
      })
      .use((request) => {
        return Response.json(request)
      })

    router1
      .match({
        pathname: '/',
        query: {
          id: Number,
        },
      })
      .use((request) => {
        return Response.json(request)
      })

    expect(async () => {
      await router0.run({
        pathname: '/',
        query: {
          id: '123',
        },
      })
    }).rejects.toThrow()

    let result1 = await router1.run({
      pathname: '/',
      query: {
        id: '123',
      },
    })

    expect(result1.info.body).toEqual({
      type: 'json',
      value: {
        pathname: '/',
        query: {
          id: 123,
        },
      },
    })
  })

  it('support passing regexp to schema.pathname', async () => {
    let router = Router()

    router
      .match({
        pathname: /^\/test/i,
      })
      .use((request) => {
        return Response.json(request)
      })

    expect(async () => {
      await router.run({
        pathname: '/abc',
      })
    }).rejects.toThrow()

    expect(async () => {
      await router.run({
        pathname: '/abc/test',
      })
    }).rejects.toThrow()

    let result0 = await router.run({
      pathname: '/test/abc',
    })

    let result1 = await router.run({
      pathname: '/test/efg',
    })

    expect(result0.info.body).toEqual({
      type: 'json',
      value: {
        pathname: '/test/abc',
      },
    })

    expect(result1.info.body).toEqual({
      type: 'json',
      value: {
        pathname: '/test/efg',
      },
    })
  })

  it('support detect response body and content-type', async () => {
    let router = Router()

    let contentTypes = [] as string[]

    let bodyTypes = [] as string[]

    router.use(async (request, next) => {
      let response = await next(request)

      if (response.is('json')) {
        contentTypes.push('json')
      }

      if (response.is('text')) {
        contentTypes.push('text')
      }

      if (response.is('html')) {
        contentTypes.push('html')
      }

      if (response.info.body?.type) {
        bodyTypes.push(response.info.body?.type)
      }

      return response
    })

    router
      .match({
        pathname: '/:type',
        params: {
          type: Union(
            Literal('json'),
            Literal('text'),
            Literal('html'),
            Literal('string'),
            Literal('buffer'),
            Literal('stream'),
          ),
        },
      })
      .use((request) => {
        if (request.params.type === 'string') {
          return Response.string('test')
        }

        if (request.params.type === 'text') {
          return Response.text('test')
        }

        if (request.params.type === 'buffer') {
          return Response.buffer(Buffer.from('test'))
        }

        if (request.params.type === 'html') {
          return Response.html('test')
        }

        if (request.params.type === 'json') {
          return Response.json('test')
        }

        if (request.params.type === 'stream') {
          return Response.stream(
            new Stream.Readable({
              read() {
                this.push('test')
                this.push(null)
              },
            }),
          )
        }

        return Response.json(request)
      })

    await router.run({
      pathname: '/json',
    })

    await router.run({
      pathname: '/json',
    })

    await router.run({
      pathname: '/text',
    })

    await router.run({
      pathname: '/buffer',
    })

    await router.run({
      pathname: '/html',
    })

    await router.run({
      pathname: '/stream',
    })

    await router.run({
      pathname: '/string',
    })

    expect(contentTypes).toEqual(['json', 'json', 'text', 'html'])
    expect(bodyTypes).toEqual(['json', 'json', 'string', 'buffer', 'string', 'stream', 'string'])
  })
})

describe('Router Url Pattern', () => {
  it('support dynamic params in pathname', async () => {
    let router = Router()

    router
      .match({
        url: '/string/<arg:string>',
      })
      .use(async (request) => {
        return Response.json({
          type: 'string',
          arg: request.params.arg,
        })
      })

    router
      .match({
        url: '/boolean/<arg:boolean>',
      })
      .use(async (request) => {
        return Response.json({
          type: 'boolean',
          arg: request.params.arg,
        })
      })

    router
      .match({
        url: '/number/<arg:number>',
      })
      .use(async (request) => {
        return Response.json({
          type: 'number',
          arg: request.params.arg,
        })
      })

    router
      .match({
        url: '/int/<arg:int>',
      })
      .use(async (request) => {
        return Response.json({
          type: 'int',
          arg: request.params.arg,
        })
      })

    router
      .match({
        url: '/float/<arg:float>',
      })
      .use(async (request) => {
        return Response.json({
          type: 'float',
          arg: request.params.arg,
        })
      })

    router
      .match({
        url: '/id/<arg:id>',
      })
      .use(async (request) => {
        return Response.json({
          type: 'id',
          arg: request.params.arg,
        })
      })

    router
      .match({
        url: '/literal/<arg:{123}|{abc}>',
      })
      .use(async (request) => {
        return Response.json({
          type: 'literal',
          arg: request.params.arg,
        })
      })

    router
      .match({
        url: '/union/<arg:number|boolean|string>',
      })
      .use(async (request) => {
        return Response.json({
          type: 'union',
          arg: request.params.arg,
        })
      })

    expect(async () => {
      await router.run({
        pathname: '/abc',
      })
    }).rejects.toThrow()

    let result0 = await router.run({
      pathname: '/string/123',
    })

    expect(result0.info.body).toEqual({
      type: 'json',
      value: {
        type: 'string',
        arg: '123',
      },
    })

    let result1 = await router.run({
      pathname: '/number/123.456',
    })

    expect(result1.info.body).toEqual({
      type: 'json',
      value: {
        type: 'number',
        arg: 123.456,
      },
    })

    let result2 = await router.run({
      pathname: '/int/123.456',
    })

    expect(result2.info.body).toEqual({
      type: 'json',
      value: {
        type: 'int',
        arg: 123,
      },
    })

    let result3 = await router.run({
      pathname: '/float/123.456',
    })

    expect(result3.info.body).toEqual({
      type: 'json',
      value: {
        type: 'float',
        arg: 123.456,
      },
    })

    let result4 = await router.run({
      pathname: '/boolean/true',
    })

    expect(result4.info.body).toEqual({
      type: 'json',
      value: {
        type: 'boolean',
        arg: true,
      },
    })

    let result5 = await router.run({
      pathname: '/boolean/false',
    })

    expect(result5.info.body).toEqual({
      type: 'json',
      value: {
        type: 'boolean',
        arg: false,
      },
    })

    let result6 = await router.run({
      pathname: '/id/1234123',
    })

    expect(result6.info.body).toEqual({
      type: 'json',
      value: {
        type: 'id',
        arg: '1234123',
      },
    })

    let result7 = await router.run({
      pathname: '/literal/123',
    })

    expect(result7.info.body).toEqual({
      type: 'json',
      value: {
        type: 'literal',
        arg: '123',
      },
    })

    let result8 = await router.run({
      pathname: '/literal/abc',
    })

    expect(result8.info.body).toEqual({
      type: 'json',
      value: {
        type: 'literal',
        arg: 'abc',
      },
    })

    let result9 = await router.run({
      pathname: '/union/abc',
    })

    expect(result9.info.body).toEqual({
      type: 'json',
      value: {
        type: 'union',
        arg: 'abc',
      },
    })

    let result10 = await router.run({
      pathname: '/union/123',
    })

    expect(result10.info.body).toEqual({
      type: 'json',
      value: {
        type: 'union',
        arg: 123,
      },
    })

    let result11 = await router.run({
      pathname: '/union/false',
    })

    expect(result11.info.body).toEqual({
      type: 'json',
      value: {
        type: 'union',
        arg: false,
      },
    })
  })

  it('support dynamic params in querystring', async () => {
    let router = Router()

    router
      .match({
        url: '/string?<arg:string>',
      })
      .use(async (request) => {
        return Response.json({
          type: 'string',
          arg: request.query.arg,
        })
      })

    router
      .match({
        url: '/boolean?<arg:boolean>',
      })
      .use(async (request) => {
        return Response.json({
          type: 'boolean',
          arg: request.query.arg,
        })
      })

    router
      .match({
        url: '/number?<arg:number>',
      })
      .use(async (request) => {
        return Response.json({
          type: 'number',
          arg: request.query.arg,
        })
      })

    router
      .match({
        url: '/int?<arg:int>',
      })
      .use(async (request) => {
        return Response.json({
          type: 'int',
          arg: request.query.arg,
        })
      })

    router
      .match({
        url: '/float?<arg:float>',
      })
      .use(async (request) => {
        return Response.json({
          type: 'float',
          arg: request.query.arg,
        })
      })

    router
      .match({
        url: '/id?<arg:id>',
      })
      .use(async (request) => {
        return Response.json({
          type: 'id',
          arg: request.query.arg,
        })
      })

    router
      .match({
        url: '/literal?<arg:{123}|{abc}>',
      })
      .use(async (request) => {
        return Response.json({
          type: 'literal',
          arg: request.query.arg,
        })
      })

    router
      .match({
        url: '/union?<arg:number|boolean|string>',
      })
      .use(async (request) => {
        return Response.json({
          type: 'union',
          arg: request.query.arg,
        })
      })

    expect(async () => {
      await router.run({
        pathname: '/abc',
      })
    }).rejects.toThrow()

    let result0 = await router.run({
      pathname: '/string',
      query: {
        arg: '123',
      },
    })

    expect(result0.info.body).toEqual({
      type: 'json',
      value: {
        type: 'string',
        arg: '123',
      },
    })

    let result1 = await router.run({
      pathname: '/number',
      query: {
        arg: '123.456',
      },
    })

    expect(result1.info.body).toEqual({
      type: 'json',
      value: {
        type: 'number',
        arg: 123.456,
      },
    })

    let result2 = await router.run({
      pathname: '/int',
      query: {
        arg: '123.456',
      },
    })

    expect(result2.info.body).toEqual({
      type: 'json',
      value: {
        type: 'int',
        arg: 123,
      },
    })

    let result3 = await router.run({
      pathname: '/float',
      query: {
        arg: '123.456',
      },
    })

    expect(result3.info.body).toEqual({
      type: 'json',
      value: {
        type: 'float',
        arg: 123.456,
      },
    })

    let result4 = await router.run({
      pathname: '/boolean',
      query: {
        arg: 'true',
      },
    })

    expect(result4.info.body).toEqual({
      type: 'json',
      value: {
        type: 'boolean',
        arg: true,
      },
    })

    let result5 = await router.run({
      pathname: '/boolean',
      query: {
        arg: 'false',
      },
    })

    expect(result5.info.body).toEqual({
      type: 'json',
      value: {
        type: 'boolean',
        arg: false,
      },
    })

    let result6 = await router.run({
      pathname: '/id',
      query: {
        arg: '1234123',
      },
    })

    expect(result6.info.body).toEqual({
      type: 'json',
      value: {
        type: 'id',
        arg: '1234123',
      },
    })

    let result7 = await router.run({
      pathname: '/literal',
      query: {
        arg: '123',
      },
    })

    expect(result7.info.body).toEqual({
      type: 'json',
      value: {
        type: 'literal',
        arg: '123',
      },
    })

    let result8 = await router.run({
      pathname: '/literal',
      query: {
        arg: 'abc',
      },
    })

    expect(result8.info.body).toEqual({
      type: 'json',
      value: {
        type: 'literal',
        arg: 'abc',
      },
    })

    let result9 = await router.run({
      pathname: '/union',
      query: {
        arg: 'abc',
      },
    })

    expect(result9.info.body).toEqual({
      type: 'json',
      value: {
        type: 'union',
        arg: 'abc',
      },
    })

    let result10 = await router.run({
      pathname: '/union',
      query: {
        arg: '123',
      },
    })

    expect(result10.info.body).toEqual({
      type: 'json',
      value: {
        type: 'union',
        arg: 123,
      },
    })

    let result11 = await router.run({
      pathname: '/union',
      query: {
        arg: 'false',
      },
    })

    expect(result11.info.body).toEqual({
      type: 'json',
      value: {
        type: 'union',
        arg: false,
      },
    })
  })

  it('support static params in querystring', async () => {
    let router = Router()

    router
      .match({
        url: '/static?a=1&b=2',
      })
      .use((request) => {
        return Response.json({
          type: 'static',
          query: request.query,
        })
      })

    router
      .match({
        url: '/mix0?a=1&b=2&<c:int>',
      })
      .use((request) => {
        return Response.json({
          type: 'mix0',
          query: request.query,
        })
      })

    router
      .match({
        url: '/mix1?<a:int>&b=2&<c:int>',
      })
      .use((request) => {
        return Response.json({
          type: 'mix1',
          query: request.query,
        })
      })

    router
      .match({
        url: '/mix2?a=1&<b:id>&c=abc',
      })
      .use((request) => {
        return Response.json({
          type: 'mix2',
          query: request.query,
        })
      })

    expect(async () => {
      await router.run({
        pathname: '/static',
        query: {
          a: 'a',
          b: 'b',
        },
      })
    }).rejects.toThrow()

    let result0 = await router.run({
      pathname: '/static',
      query: {
        a: '1',
        b: '2',
      },
    })

    expect(result0.info.body).toEqual({
      type: 'json',
      value: {
        type: 'static',
        query: {
          a: '1',
          b: '2',
        },
      },
    })

    let result1 = await router.run({
      pathname: '/mix0',
      query: {
        a: '1',
        b: '2',
        c: '3.14159',
      },
    })

    expect(result1.info.body).toEqual({
      type: 'json',
      value: {
        type: 'mix0',
        query: {
          a: '1',
          b: '2',
          c: 3,
        },
      },
    })

    let result2 = await router.run({
      pathname: '/mix0',
      query: {
        a: '1',
        b: '2',
        c: 30000,
      },
    })

    expect(result2.info.body).toEqual({
      type: 'json',
      value: {
        type: 'mix0',
        query: {
          a: '1',
          b: '2',
          c: 30000,
        },
      },
    })

    expect(async () => {
      await router.run({
        pathname: '/mix0',
        query: {
          a: '1',
          b: '2',
          c: 'abc',
        },
      })
    }).rejects.toThrow()

    let result3 = await router.run({
      pathname: '/mix1',
      query: {
        a: '1',
        b: '2',
        c: 30000,
      },
    })

    expect(result3.info.body).toEqual({
      type: 'json',
      value: {
        type: 'mix1',
        query: {
          a: 1,
          b: '2',
          c: 30000,
        },
      },
    })

    expect(async () => {
      await router.run({
        pathname: '/mix1',
        query: {
          a: '1',
          b: '3',
          c: 30000,
        },
      })
    }).rejects.toThrow()

    let result4 = await router.run({
      pathname: '/mix2',
      query: {
        a: '1',
        b: '2123123123',
        c: 'abc',
      },
    })

    expect(result4.info.body).toEqual({
      type: 'json',
      value: {
        type: 'mix2',
        query: {
          a: '1',
          b: '2123123123',
          c: 'abc',
        },
      },
    })

    expect(async () => {
      await router.run({
        pathname: '/mix1',
        query: {
          a: '2',
          b: '3',
          c: 'abc',
        },
      })
    }).rejects.toThrow()
  })

  it('support using dynamic params in pathname and querystring at the same time', async () => {
    let router = Router()

    router
      .match({
        url: '/test0/<name:string>/<age:int>?static=abc&<dynamic:int>',
      })
      .use((request) => {
        return Response.json({
          type: 'test0',
          ...request,
        })
      })

    expect(async () => {
      await router.run({
        pathname: '/test0/farrow/20',
        query: {
          static: 'abc',
        },
      })
    }).rejects.toThrow()

    let result0 = await router.run({
      pathname: '/test0/farrow/20',
      query: {
        static: 'abc',
        dynamic: '20',
      },
    })

    expect(result0.info.body).toEqual({
      type: 'json',
      value: {
        type: 'test0',
        pathname: '/test0/farrow/20',
        params: {
          name: 'farrow',
          age: 20,
        },
        query: {
          static: 'abc',
          dynamic: 20,
        },
      },
    })
  })

  it('support modifier in dynamic params', async () => {
    let router = Router()

    router
      .match({
        url: '/optional/<name?:string>',
      })
      .use((request) => {
        return Response.json({
          type: 'optional',
          value: request.params.name ?? 'default-value',
        })
      })

    router
      .match({
        url: '/zero/or/more/<name*:string>',
      })
      .use((request) => {
        return Response.json({
          type: 'zero-or-more',
          value: request.params.name as JsonType,
        })
      })

    router
      .match({
        url: '/one/or/more/<name+:string>',
      })
      .use((request) => {
        return Response.json({
          type: 'one-or-more',
          value: request.params.name as JsonType,
        })
      })

    let result0 = await router.run({
      pathname: '/optional',
    })

    expect(result0.info.body).toEqual({
      type: 'json',
      value: {
        type: 'optional',
        value: 'default-value',
      },
    })

    let result1 = await router.run({
      pathname: '/optional/abc',
    })

    expect(result1.info.body).toEqual({
      type: 'json',
      value: {
        type: 'optional',
        value: 'abc',
      },
    })

    let result2 = await router.run({
      pathname: '/zero/or/more',
    })

    expect(result2.info.body).toEqual({
      type: 'json',
      value: {
        type: 'zero-or-more',
      },
    })

    let result3 = await router.run({
      pathname: '/zero/or/more/abc',
    })

    expect(result3.info.body).toEqual({
      type: 'json',
      value: {
        type: 'zero-or-more',
        value: ['abc'],
      },
    })

    let result4 = await router.run({
      pathname: '/zero/or/more/abc/efg',
    })

    expect(result4.info.body).toEqual({
      type: 'json',
      value: {
        type: 'zero-or-more',
        value: ['abc', 'efg'],
      },
    })

    expect(async () => {
      let result5 = await router.run({
        pathname: '/one/or/more',
      })
    }).rejects.toThrow()

    let result6 = await router.run({
      pathname: '/one/or/more/abc',
    })

    expect(result6.info.body).toEqual({
      type: 'json',
      value: {
        type: 'one-or-more',
        value: ['abc'],
      },
    })

    let result7 = await router.run({
      pathname: '/one/or/more/abc/efg',
    })

    expect(result7.info.body).toEqual({
      type: 'json',
      value: {
        type: 'one-or-more',
        value: ['abc', 'efg'],
      },
    })
  })

  it('support routing methods', async () => {
    let router = Router()

    router.get('/get0/<arg0:int>?<arg1:int>').use(
      (request: {
        readonly pathname: string
        readonly params: {
          readonly arg0: number
        }
        readonly query: {
          readonly arg1: number
        }
        readonly method: string
      }) => {
        return Response.json({
          type: 'get',
          request,
        })
      },
    )

    router
      .get('/get1/<arg0:int>?<arg1:int>', {
        headers: {
          a: Int,
        },
      })
      .use(
        (request: {
          readonly pathname: string
          readonly params: {
            readonly arg0: number
          }
          readonly query: {
            readonly arg1: number
          }
          readonly method: string
          readonly headers: {
            readonly a: number
          }
        }) => {
          return Response.json({
            type: 'get',
            request,
          })
        },
      )

    router
      .post('/post/<arg0:int>?<arg1:int>', {
        body: {
          a: Int,
          b: Float,
        },
      })
      .use((request) => {
        return Response.json({
          type: 'post',
          request,
        })
      })

    router
      .put('/put/<arg0:int>?<arg1:int>', {
        body: {
          a: Int,
          b: Float,
        },
      })
      .use((request) => {
        return Response.json({
          type: 'put',
          request,
        })
      })

    router
      .delete('/delete/<arg0:int>?<arg1:int>', {
        body: {
          a: Int,
          b: Float,
        },
      })
      .use((request) => {
        return Response.json({
          type: 'delete',
          request,
        })
      })

    router
      .patch('/patch/<arg0:int>?<arg1:int>', {
        body: {
          a: Int,
          b: Float,
        },
      })
      .use((request) => {
        return Response.json({
          type: 'patch',
          request,
        })
      })

    router
      .head('/head/<arg0:int>?<arg1:int>', {
        body: {
          a: Int,
          b: Float,
        },
      })
      .use((request) => {
        return Response.json({
          type: 'head',
          request,
        })
      })

    router
      .options('/options/<arg0:int>?<arg1:int>', {
        body: {
          a: Int,
          b: Float,
        },
      })
      .use((request) => {
        return Response.json({
          type: 'options',
          request,
        })
      })

    let result0 = await router.run({
      pathname: '/get0/123',
      method: 'get',
      query: {
        arg1: '456',
      },
    })

    expect(result0.info.body).toEqual({
      type: 'json',
      value: {
        type: 'get',
        request: {
          method: 'get',
          pathname: '/get0/123',
          params: {
            arg0: 123,
          },
          query: {
            arg1: 456,
          },
        },
      },
    })

    let result1 = await router.run({
      pathname: '/get1/123',
      method: 'get',
      query: {
        arg1: '456',
      },
      headers: {
        a: '789',
      },
    })

    expect(result1.info.body).toEqual({
      type: 'json',
      value: {
        type: 'get',
        request: {
          pathname: '/get1/123',
          method: 'get',
          params: {
            arg0: 123,
          },
          query: {
            arg1: 456,
          },
          headers: {
            a: 789,
          },
        },
      },
    })

    let result2 = await router.run({
      pathname: '/post/123',
      method: 'post',
      query: {
        arg1: '456',
      },
      body: {
        a: 3,
        b: 3.14,
      },
    })

    expect(result2.info.body).toEqual({
      type: 'json',
      value: {
        type: 'post',
        request: {
          pathname: '/post/123',
          method: 'post',
          params: {
            arg0: 123,
          },
          query: {
            arg1: 456,
          },
          body: {
            a: 3,
            b: 3.14,
          },
        },
      },
    })

    let result3 = await router.run({
      pathname: '/put/123',
      method: 'put',
      query: {
        arg1: '456',
      },
      body: {
        a: 3,
        b: 3.14,
      },
    })

    expect(result3.info.body).toEqual({
      type: 'json',
      value: {
        type: 'put',
        request: {
          pathname: '/put/123',
          method: 'put',
          params: {
            arg0: 123,
          },
          query: {
            arg1: 456,
          },
          body: {
            a: 3,
            b: 3.14,
          },
        },
      },
    })

    let result4 = await router.run({
      pathname: '/patch/123',
      method: 'patch',
      query: {
        arg1: '456',
      },
      body: {
        a: 3,
        b: 3.14,
      },
    })

    expect(result4.info.body).toEqual({
      type: 'json',
      value: {
        type: 'patch',
        request: {
          pathname: '/patch/123',
          method: 'patch',
          params: {
            arg0: 123,
          },
          query: {
            arg1: 456,
          },
          body: {
            a: 3,
            b: 3.14,
          },
        },
      },
    })

    let result5 = await router.run({
      pathname: '/head/123',
      method: 'head',
      query: {
        arg1: '456',
      },
      body: {
        a: 3,
        b: 3.14,
      },
    })

    expect(result5.info.body).toEqual({
      type: 'json',
      value: {
        type: 'head',
        request: {
          pathname: '/head/123',
          method: 'head',
          params: {
            arg0: 123,
          },
          query: {
            arg1: 456,
          },
          body: {
            a: 3,
            b: 3.14,
          },
        },
      },
    })

    let result6 = await router.run({
      pathname: '/options/123',
      method: 'options',
      query: {
        arg1: '456',
      },
      body: {
        a: 3,
        b: 3.14,
      },
    })

    expect(result6.info.body).toEqual({
      type: 'json',
      value: {
        type: 'options',
        request: {
          pathname: '/options/123',
          method: 'options',
          params: {
            arg0: 123,
          },
          query: {
            arg1: 456,
          },
          body: {
            a: 3,
            b: 3.14,
          },
        },
      },
    })

    let result7 = await router.run({
      pathname: '/delete/123',
      method: 'delete',
      query: {
        arg1: '456',
      },
      body: {
        a: 3,
        b: 3.14,
      },
    })

    expect(result7.info.body).toEqual({
      type: 'json',
      value: {
        type: 'delete',
        request: {
          pathname: '/delete/123',
          method: 'delete',
          params: {
            arg0: 123,
          },
          query: {
            arg1: 456,
          },
          body: {
            a: 3,
            b: 3.14,
          },
        },
      },
    })
  })

  it('support literal string unions', async () => {
    let router = Router()

    router.get('/some-service/<client:{mac}|{win}|{iphone}|{android}|{api}>/users/<id:number>').use(
      (request: {
        readonly pathname: string
        readonly params: {
          readonly client: 'mac' | 'win' | 'iphone' | 'android' | 'api'
          readonly id: number
        }
        readonly method: string
      }) => {
        return Response.json(request)
      },
    )

    let result0 = await router.run({
      pathname: '/some-service/mac/users/123',
      method: 'GET',
    })

    expect(result0.info.body).toEqual({
      type: 'json',
      value: {
        pathname: '/some-service/mac/users/123',
        method: 'GET',
        params: {
          client: 'mac',
          id: 123,
        },
      },
    })
  })

  it('serve static files', async () => {
    let router = Router()

    router.serve('/static', path.resolve(__dirname, './static'))

    router.use((request) => {
      return Response.text('Cheer!')
    })

    let result0 = await router.run({
      pathname: '/static/foo.js',
      method: 'GET',
    })

    let result1 = await router.run({
      pathname: '/static/cheer',
      method: 'GET',
    })

    let result2 = await router.run({
      pathname: '/static',
      method: 'GET',
    })

    expect(result0.info.body?.type).toEqual('file')
    expect(result1.info.body?.type).toEqual('string')
    if (result1.info.body?.type === 'string') {
      expect(result1.info.body?.value).toEqual('Cheer!')
    }
    expect(result2.info.body?.type).toEqual('string')
    if (result2.info.body?.type === 'string') {
      expect(result2.info.body?.value).toEqual('Cheer!')
    }
  })
})
