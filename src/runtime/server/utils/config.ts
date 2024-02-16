import type { H3Error } from 'h3'

export type configValidationResult = {
  valid: boolean,
  error?: H3Error
}

export function validateConfig(config: any, requiredKeys: string[]): configValidationResult {
  const missingKeys: string[] = []
  requiredKeys.forEach(key => {
    if (!config[key]) {
      missingKeys.push(key)
    }
  })
  if (missingKeys.length) {
    const error = createError({
      statusCode: 500,
      message: `Missing config keys: ${missingKeys.join(', ')}. Please pass the required parameters either as env variables or as part of the config parameter.`
    })

    return {
      valid: false,
      error
    }
  }
  return { valid: true }
}
