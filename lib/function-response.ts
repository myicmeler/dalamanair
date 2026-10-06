export async function requireFunctionSuccess(response: Response): Promise<Response> {
  if (!response.ok) {
    throw new Error(`The service could not complete the request (HTTP ${response.status}). Please try again.`)
  }
  return response
}
