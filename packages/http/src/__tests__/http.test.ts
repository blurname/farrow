import request from 'supertest'

import fs from 'fs'
import { Stream } from 'stream'

import { Http, HttpPipelineOptions, Router, Response, useRequestInfo, useReq, useRes, usePrefix } from '../'
import path from 'path'
import { Nullable } from 'farrow-schema'
import { createContext } from 'farrow-pipeline'

const delay = (time: number) => {
  return new Promise((resolve) => {
    setTimeout(resolve, time)
  })
}

const createHttp = (options?: HttpPipelineOptions) => {
  return Http({
    logger: false,
    ...options,
  })
}

describe('Http', () => {
  describe('Response', () => {
    it('support text response', async () => {
      let http = createHttp()

      http
        .match({
          pathname: '/test',
        })
        .use((data) => {
          return Response.text(JSON.stringify(data))
        })

      await request(http.server())
        .get('/test')
        .expect('Content-Type', /text/)
        .expect(
          'Content-Length',
          JSON.stringify({
            pathname: '/test',
          }).length.toString(),
        )
        .expect(
          200,
          JSON.stringify({
            pathname: '/test',
          }),
        )
    })

    it('support html response', async () => {
      let http = createHttp()

      http
        .match({
          pathname: '/test',
        })
        .use((data) => {
          return Response.html(JSON.stringify(data))
        })

      await request(http.server())
        .get('/test')
        .expect('Content-Type', /html/)
        .expect(
          'Content-Length',
          JSON.stringify({
            pathname: '/test',
          }).length.toString(),
        )
        .expect(
          200,
          JSON.stringify({
            pathname: '/test',
          }),
        )
    })

    it('support json response', async () => {
      let http = createHttp()

      http
        .match({
          pathname: '/test',
        })
        .use((data) => {
          return Response.json(data)
        })

      await request(http.server())
        .get('/test')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200, {
          pathname: '/test',
        })
    })

    it('support empty response', async () => {
      let http = createHttp()

      http
        .match({
          pathname: '/test',
        })
        .use(() => {
          return Response.empty()
        })

      await request(http.server())
        .get('/test')
        .set('Accept', 'text/plain')
        .expect('Content-Type', /text/)
        .expect(204, '')
    })

    it('support redirecting', async () => {
      let http = createHttp()

      http
        .match({
          pathname: '/test',
        })
        .use(() => {
          return Response.redirect('/redirected')
        })

      await request(http.server()).get('/test').expect('Location', '/redirected').expect(302)
    })

    it('support stream response', async () => {
      let http = createHttp()

      http
        .match({
          pathname: '/test',
        })
        .use(() => {
          let stream = new Stream.Readable({
            read() {
              this.push('test stream')
              this.push(null)
            },
          })
          return Response.stream(stream)
        })

      await request(http.server()).get('/test').expect(200, 'test stream')
    })

    it('support buffer response', async () => {
      let http = createHttp()

      http
        .match({
          pathname: '/test',
        })
        .use(() => {
          return Response.buffer(Buffer.from('test buffer'))
        })

      await request(http.server()).get('/test').expect(200, 'test buffer')
    })

    it('support file response', async () => {
      let http = createHttp()

      let filename = path.join(__dirname, 'http.test.ts')

      let content = await fs.promises.readFile(filename)

      http
        .match({
          pathname: '/test',
        })
        .use(() => {
          return Response.file(filename)
        })

      await request(http.server()).get('/test').expect(200, content)
    })

    it('support raw response', async () => {
      let http = createHttp()

      http
        .match({
          pathname: '/test',
        })
        .use(() => {
          return Response.raw('test raw body')
        })

      await request(http.server()).get('/test').expect(200, 'test raw body')
    })

    it('support custom response', async () => {
      let http = createHttp()

      http
        .match({
          pathname: '/test',
        })
        .use(() => {
          return Response.custom(({ req, res, requestInfo, responseInfo }) => {
            res.end(
              JSON.stringify({
                requestInfo: {
                  ...requestInfo,
                  headers: null,
                },
                responseInfo,
              }),
            )
          })
        })

      await request(http.server())
        .get('/test')
        .expect(
          200,
          JSON.stringify({
            requestInfo: {
              pathname: '/test',
              method: 'GET',
              query: {},
              body: null,
              headers: null,
              cookies: {},
            },
            responseInfo: {},
          }),
        )
    })

    it('should not be matched when pathname or method failed to match', async () => {
      let http = createHttp()
      let server = http.server()

      http
        .match({
          pathname: '/test',
          method: 'POST',
        })
        .use((request) => {
          return Response.json(request)
        })

      await request(server).get('/test').expect(404)
      await request(server).post('/test0').expect(404)
      await request(server).post('/test').expect(200, {
        pathname: '/test',
        method: 'POST',
      })
    })

    it('should responding 500 when there are no middlewares handling request', async () => {
      let http = createHttp()

      http.match({
        pathname: '/test',
      })

      await request(http.server()).get('/test').expect(500)
    })

    it('should responding 500 when middleware throwed error', async () => {
      let http = createHttp()

      http.use((request, next) => {
        if (request.pathname === '/sync') {
          throw new Error('sync error')
        }
        return next()
      })

      http.use(async (request, next) => {
        if (request.pathname === '/async') {
          await delay(10)
          throw new Error('async error')
        }
        return next()
      })

      http.use(() => {
        return Response.json({
          ok: true,
        })
      })

      await request(http.server()).get('/sync').expect(500)
      await request(http.server()).get('/async').expect(500)
      await request(http.server()).get('/').expect(200, {
        ok: true,
      })
    })

    it('support set response status', async () => {
      let http = createHttp()
      let server = http.server()

      http
        .match({
          pathname: '/test-status',
        })
        .use(() => {
          return Response.status(302, 'abc').text('ok')
        })

      await request(server).get('/test-status').expect(302)
    })

    it('support set response headers', async () => {
      let http = createHttp()
      let server = http.server()

      http
        .match({
          pathname: '/test-header',
        })
        .use(() => {
          return Response.header('test-header', 'header-value').text('ok')
        })

      http
        .match({
          pathname: '/test-headers',
        })
        .use(() => {
          return Response.headers({
            'test-header1': 'header1-value',
            'test-header2': 'header2-value',
          }).text('ok')
        })

      await request(server).get('/test-header').expect('test-header', 'header-value').expect(200)
      await request(server)
        .get('/test-headers')
        .expect('test-header1', 'header1-value')
        .expect('test-header2', 'header2-value')
        .expect(200)
    })

    it('support set response cookies', async () => {
      let http = createHttp()
      let server = http.server()

      http
        .match({
          pathname: '/test-cookie',
          method: 'POST',
        })
        .use(() => {
          return Response.cookie('test-cookie', 'cookie-value').text('set cookie ok')
        })

      http
        .match({
          pathname: '/test-cookies',
          method: 'POST',
        })
        .use(() => {
          return Response.cookies({
            'test-cookie1': 'cookie1-value',
            'test-cookie2': 'cookie2-value',
          }).text('set cookies ok')
        })

      await request(server)
        .post('/test-cookie')
        .expect('set-cookie', 'test-cookie=cookie-value; path=/; httponly')
        .expect(200, 'set cookie ok')

      await request(server)
        .post('/test-cookies')
        .expect(
          'set-cookie',
          ['test-cookie1=cookie1-value; path=/; httponly', 'test-cookie2=cookie2-value; path=/; httponly'].join(','),
        )
        .expect(200, 'set cookies ok')
    })

    it('support set response vary', async () => {
      let http = createHttp()
      let server = http.server()

      http
        .match({
          pathname: '/test-vary',
        })
        .use(() => {
          return Response.vary('origin', 'cookie').text('ok')
        })

      await request(server).get('/test-vary').expect('vary', 'origin, cookie').expect(200, 'ok')
    })

    it('support set attachment', async () => {
      let http = createHttp()
      let server = http.server()

      http
        .match({
          pathname: '/test-vary',
        })
        .use(() => {
          return Response.attachment('test.txt').text('ok')
        })

      await request(server)
        .get('/test-vary')
        .expect('content-disposition', 'attachment; filename="test.txt"')
        .expect(200, 'ok')
    })

    it('support set content-type via mime-type', async () => {
      let http = createHttp()
      let server = http.server()

      http
        .match({
          pathname: '/test-type',
          method: 'POST',
          body: {
            type: String,
          },
        })
        .use((request) => {
          return Response.type(request.body.type).buffer(
            Buffer.from(
              JSON.stringify({
                success: true,
                data: request.body,
              }),
            ),
          )
        })

      await request(server)
        .post('/test-type')
        .send({
          type: 'png',
        })
        .expect('Content-Type', 'image/png')

      await request(server)
        .post('/test-type')
        .send({
          type: 'jpg',
        })
        .expect('Content-Type', 'image/jpeg')

      await request(server)
        .post('/test-type')
        .send({
          type: 'file.js',
        })
        .expect('Content-Type', 'application/javascript; charset=utf-8')

      await request(server)
        .post('/test-type')
        .send({
          type: 'file.html',
        })
        .expect('Content-Type', 'text/html; charset=utf-8')

      await request(server)
        .post('/test-type')
        .send({
          type: 'file.css',
        })
        .expect('Content-Type', 'text/css; charset=utf-8')

      await request(server)
        .post('/test-type')
        .send({
          type: 'file.json',
        })
        .expect('Content-Type', 'application/json; charset=utf-8')
    })

    it('support merging response in two directions', async () => {
      let http = createHttp()
      let server = http.server()

      http
        .match({
          pathname: '/test-merge-01',
        })
        .use(async (request, next) => {
          let response = await next(request)
          return response.merge(Response.text('one'))
        })
        .use(() => {
          return Response.text('two')
        })

      http
        .match({
          pathname: '/test-merge-02',
        })
        .use(async (request, next) => {
          let response = await next(request)
          return Response.text('one').merge(response)
        })
        .use(() => {
          return Response.text('two')
        })

      await request(server).get('/test-merge-01').expect(200, 'one')
      await request(server).get('/test-merge-02').expect(200, 'two')
      await request(server).get('/test-merge-03').expect(404)
    })

    it('support serving static files', async () => {
      let http = createHttp()
      let server = http.server()

      let dirname = path.join(__dirname, '../../')

      let read = async (filename: string) => {
        let buffer = await fs.promises.readFile(path.join(dirname, filename))
        return buffer.toString()
      }

      http.serve('/static', dirname)

      await request(server)
        .get('/static/package.json')
        .expect('Content-Type', /json/)
        .expect(200, await read('package.json'))

      await request(server)
        .get('/static/README.md')
        .expect('Content-Type', /markdown/)
        .expect(200, await read('README.md'))

      await request(server)
        .get('/static/dist/index.js')
        .expect(200, await read('dist/index.js'))

      await request(server).get('/static/abc').expect(404)
    })

    it('support capturing response by type', async () => {
      let http = createHttp()
      let server = http.server()

      http.capture('text', (textBody) => {
        return Response.text(`capture: ${textBody.value}`)
      })

      http.capture('json', (jsonBody) => {
        return Response.json({
          capture: true,
          original: jsonBody.value,
        })
      })

      http
        .match({
          pathname: '/test-text',
        })
        .use(() => {
          return Response.text('some text')
        })

      http
        .match({
          pathname: '/test-json',
        })
        .use(() => {
          return Response.json({
            data: 'ok',
          })
        })

      await request(server).get('/test-text').expect('Content-Type', /text/).expect(200, 'capture: some text')

      await request(server)
        .get('/test-json')
        .expect('Content-Type', /json/)
        .expect(200, {
          capture: true,
          original: {
            data: 'ok',
          },
        })
    })

    it('support injecting context', async () => {
      let TestContext = createContext(0)

      let http = createHttp({
        contexts: () => {
          return {
            test: TestContext.create(10),
          }
        },
      })

      let server = http.server()

      http.use(async () => {
        let ctx = TestContext.use()
        let value = ctx.value
        ctx.value += 1
        return Response.text(value.toString())
      })

      await request(server).get('/').expect(200, '10')
      await request(server).get('/any').expect(200, '10')
    })
  })

  describe('Request', () => {
    it('support access native req/res via useReq/useRes', async () => {
      let http = createHttp()

      http.use(() => {
        let req = useReq()
        let res = useRes()

        res.statusCode = 200
        res.end(req.url)

        return Response.custom()
      })

      await request(http.server()).get('/test-abc').expect(200, '/test-abc')
    })

    it('support accessing request info via useRequestInfo', async () => {
      let http = createHttp()

      http.use(() => {
        let info = useRequestInfo()

        return Response.json({
          ...info,
          headers: {
            cookie: info.headers?.cookie,
            'content-type': 'application/json',
            accept: 'application/json',
            'content-length': '13',
          },
        })
      })

      await request(http.server())
        .post('/test-abc?a=1&b=2')
        .set('Accept', 'application/json')
        .set('Cookie', ['nameOne=valueOne;nameTwo=valueTwo'])
        .send({
          a: 1,
          b: 2,
        })
        .expect(200, {
          pathname: '/test-abc',
          method: 'POST',
          query: { a: '1', b: '2' },
          body: { a: 1, b: 2 },
          headers: {
            accept: 'application/json',
            cookie: 'nameOne=valueOne;nameTwo=valueTwo',
            'content-type': 'application/json',
            'content-length': '13',
          },
          cookies: { nameOne: 'valueOne', nameTwo: 'valueTwo' },
        })
    })

    it('support passing new request info to downstream', async () => {
      let http = createHttp()
      let server = http.server()

      http.use((request, next) => {
        if (request.pathname.startsWith('/new')) {
          return next({
            ...request,
            pathname: request.pathname.replace('/new', ''),
            query: {
              ...request.query,
              new: true,
            },
          })
        } else {
          return next()
        }
      })

      http
        .match({
          pathname: '/test',
          query: {
            a: String,
            new: Nullable(Boolean),
          },
        })
        .use((request) => {
          return Response.json(request)
        })

      await request(server)
        .get('/test?a=1')
        .expect(200, {
          pathname: '/test',
          query: {
            a: '1',
          },
        })

      await request(server)
        .get('/new/test?a=1')
        .expect(200, {
          pathname: '/test',
          query: {
            a: '1',
            new: true,
          },
        })
    })
  })

  describe('Router', () => {
    it('should support add router', async () => {
      let http = createHttp()
      let router = Router()
      let server = http.server()

      router
        .match({
          pathname: '/abc',
        })
        .use((request) => {
          return Response.text(request.pathname)
        })

      http.use(router)
      http.route('/base', router)

      await request(server).get('/abc').expect(200, '/abc')
      await request(server).get('/base/abc').expect(200, '/abc')
    })

    it('should support using router in another router', async () => {
      let http = createHttp()
      let router0 = Router()
      let router1 = Router()
      let server = http.server()

      http.route('/router0', router0)
      router0.route('/router1', router1)

      http
        .match({
          pathname: '/abc',
        })
        .use((request) => {
          let prefix = usePrefix()
          return Response.json({
            from: 'http',
            prefix,
            pathname: request.pathname,
          })
        })

      router0
        .match({
          pathname: '/abc',
        })
        .use((request) => {
          let prefix = usePrefix()
          return Response.json({
            from: 'router0',
            prefix,
            pathname: request.pathname,
          })
        })

      router1
        .match({
          pathname: '/abc',
        })
        .use((request) => {
          let prefix = usePrefix()
          return Response.json({
            from: 'router1',
            prefix,
            pathname: request.pathname,
          })
        })

      await request(server).get('/abc').expect(200, {
        from: 'http',
        prefix: '',
        pathname: '/abc',
      })

      await request(server).get('/router0/abc').expect(200, {
        from: 'router0',
        prefix: '/router0',
        pathname: '/abc',
      })

      await request(server).get('/router0/router1/abc').expect(200, {
        from: 'router1',
        prefix: '/router0/router1',
        pathname: '/abc',
      })
    })
  })
})