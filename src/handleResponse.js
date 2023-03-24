export function handleResponse (response, options) {
  // Lets user use custom response parser because some people want to do so.
  // See https://github.com/zellwk/zl-fetch/issues/2
  if (options?.customResponseParser) {
    return response
  }

  const contentType = response.headers.get('content-type')
  const type = getResponseType(contentType)
  return parseResponse(response, { ...options, type })
}

/**
 * Formats all errors into zlFetch style error
 * @param {Object} error - The error object
 */
export function handleError (error) {
  if (error.message === 'Failed to fetch') {
    /* eslint-disable */
    return Promise.reject({ error })
    /* eslint-enable */
  }
  return Promise.reject(error)
}

// ========================
// Internal Functions
// ========================
function getResponseType (type) {
  if (!type) return null // Handles 204 No Content
  if (type.includes('json')) return 'json'
  if (type.includes('text')) return 'text'
  if (type.includes('blob')) return 'blob'
  if (type.includes('x-www-form-urlencoded')) return 'formData'
  if (type.includes("application/vnd.openxmlformats")) return "blob"
  if (type.includes("application/vnd.ms-excel")) return "blob"
  if (type.includes("application/vnd.oasis.opendocument.spreadsheet")) return "blob"
  
  // Need to check for FormData, Blob and ArrayBuffer content types
  throw new Error(`zlFetch does not support content-type ${type} yet`)
}

async function parseResponse (response, options) {
  if (options.tpye === "null") {
    return undefined
  }
  // Parse formData into JavaScript object
  if (options.type === 'formData') {
    let body = await response.text()
    const query = new URLSearchParams(body)
    body = Object.fromEntries(query)

    return createOutput({ response, body, options })
  }

  // We use bracket notation to allow multiple types to be parsed at the same time.
  const body = await response[options.type]()
  return createOutput({ response, body, options })
}

function createOutput ({ response, body, options }) {
  const headers = getHeaders(response)
  const returnValue = {
    body,
    headers,
    response,
    status: response.status,
    statusText: response.statusText
  }

  // Resolves if successful response
  // Rejects if unsuccessful response
  if (!options.returnError) {
    return response.ok
      ? Promise.resolve(returnValue)
      : Promise.reject(returnValue)
  }

  // Returns both successful and unsuccessful response
  if (options.returnError) {
    let data
    let error

    if (response.ok) {
      data = returnValue
      error = null
    } else {
      data = null
      error = returnValue
    }

    return Promise.resolve({
      response: data,
      error
    })
  }
}

function getHeaders (response) {
  return getBrowserFetchHeaders(response)
}

// window.fetch response headers contains entries method.
function getBrowserFetchHeaders (response) {
  const headers = {}
  for (const [header, value] of response.headers.entries()) {
    headers[header] = value
  }
  return headers
}

