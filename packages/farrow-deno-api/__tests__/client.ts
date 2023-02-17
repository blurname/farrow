/**
 * This file was generated by farrow-api
 * Don't modify it manually
 */

export type JsonType =
  | number
  | string
  | boolean
  | null
  | undefined
  | JsonType[]
  | { toJSON(): string }
  | { [key: string]: JsonType }

export type SingleCalling = {
  type: 'Single'
  path: string[]
  input: Readonly<JsonType>
}

export type ApiRequest = {
  url: string
  calling: SingleCalling
  options?: RequestInit
}

export type ApiErrorResponse = {
  type: 'ApiErrorResponse'
  error: {
    message: string
  }
}

export type ApiSuccessResponse = {
  type: 'ApiSuccessResponse'
  output: JsonType
}

export type ApiResponse = ApiErrorResponse | ApiSuccessResponse

/**
 * @label CountState
 */
export type CountState = {
  /**
   * @remarks count of counter
   */
  count: number
}

export const fetcher = async (request: ApiRequest): Promise<ApiResponse> => {
  const { url, calling, options: init } = request
  const options: RequestInit = {
    method: 'POST',
    credentials: 'include',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
    body: JSON.stringify(calling),
  }
  const response = await fetch(url, options)
  const text = await response.text()
  const json = JSON.parse(text) as ApiResponse

  return json
}

export const invoke = async (calling: SingleCalling): Promise<JsonType> => {
  const result = await fetcher({ url, calling }).catch((err) => {
    throw err
  })

  const handleResult = (apiResponse: ApiResponse): JsonType => {
    if (apiResponse.type === 'ApiErrorResponse') {
      throw new Error(apiResponse.error.message)
    }

    return apiResponse.output
  }
  return handleResult(result)
}

export const url = 'http://127.0.0.1:3000/counter'

export const api = {
  getCount: (input: {}) => invoke({ type: 'Single', path: ['getCount'], input }) as Promise<CountState>,
  setCount: (input: {
    /**
     * @remarks new count value
     */
    newCount: number
  }) => invoke({ type: 'Single', path: ['setCount'], input }) as Promise<CountState>,
  triggerError: (input: {}) => invoke({ type: 'Single', path: ['triggerError'], input }) as Promise<{}>,
}
