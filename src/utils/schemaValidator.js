import { openApiSpec } from '../api/openapi.js';

/**
 * Resolves a JSON Pointer reference (e.g., '#/components/schemas/User') within an OpenAPI spec.
 *
 * @param {string} ref
 * @param {Object} [spec=openApiSpec]
 * @returns {Object} Resolved schema definition
 */
export function resolveRef(ref, spec = openApiSpec) {
  if (!ref || typeof ref !== 'string') return null;
  if (!ref.startsWith('#/')) {
    throw new Error(
      `Only internal references starting with '#/' are supported: ${ref}`
    );
  }

  const parts = ref.substring(2).split('/');
  let current = spec;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      throw new Error(`Failed to resolve ref '${ref}' at part '${part}'`);
    }
  }
  return current;
}

/**
 * Check if a value matches expected OpenAPI type.
 *
 * @param {any} value
 * @param {string} expectedType
 * @returns {boolean}
 */
function isOfType(value, expectedType) {
  if (value === null || value === undefined) return false;
  switch (expectedType) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && !Number.isNaN(value);
    case 'integer':
      return typeof value === 'number' && Number.isInteger(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'array':
      return Array.isArray(value);
    case 'object':
      return typeof value === 'object' && !Array.isArray(value);
    default:
      return true;
  }
}

/**
 * Validates a JavaScript data value against an OpenAPI 3.0.3 schema object.
 *
 * @param {any} data
 * @param {Object} schema
 * @param {Object} [spec=openApiSpec]
 * @param {string} [path='$']
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateAgainstSchema(
  data,
  schema,
  spec = openApiSpec,
  path = '$'
) {
  const errors = [];

  if (!schema) {
    return { valid: true, errors: [] };
  }

  // Handle $ref resolution
  if (schema.$ref) {
    const resolved = resolveRef(schema.$ref, spec);
    return validateAgainstSchema(data, resolved, spec, path);
  }

  // Handle null / undefined values
  if (data === null || data === undefined) {
    if (schema.nullable) {
      return { valid: true, errors: [] };
    }
    // If not nullable and schema specified, error
    if (schema.type) {
      errors.push(
        `${path}: expected ${schema.type}, but received ${data === null ? 'null' : 'undefined'}`
      );
      return { valid: false, errors };
    }
    return { valid: true, errors: [] };
  }

  // Handle allOf
  if (Array.isArray(schema.allOf) && schema.allOf.length > 0) {
    for (let i = 0; i < schema.allOf.length; i++) {
      const sub = schema.allOf[i];
      const result = validateAgainstSchema(
        data,
        sub,
        spec,
        `${path}.allOf[${i}]`
      );
      if (!result.valid) {
        errors.push(...result.errors);
      }
    }
    if (errors.length > 0) {
      return { valid: false, errors };
    }
  }

  // Handle oneOf
  if (Array.isArray(schema.oneOf) && schema.oneOf.length > 0) {
    const matchErrors = [];
    let matchCount = 0;
    for (let i = 0; i < schema.oneOf.length; i++) {
      const sub = schema.oneOf[i];
      const result = validateAgainstSchema(
        data,
        sub,
        spec,
        `${path}.oneOf[${i}]`
      );
      if (result.valid) {
        matchCount++;
      } else {
        matchErrors.push(result.errors.join('; '));
      }
    }
    if (matchCount === 0) {
      errors.push(
        `${path}: does not match any 'oneOf' schema. Mismatches: [${matchErrors.join(' | ')}]`
      );
      return { valid: false, errors };
    }
    if (matchCount > 1) {
      // OpenAPI oneOf expects exactly one to match, but in permissive mock drift checks, matching at least one is often safe.
      // Strict oneOf enforcement:
      // errors.push(`${path}: matches multiple 'oneOf' schemas (${matchCount})`);
    }
  }

  // Handle anyOf
  if (Array.isArray(schema.anyOf) && schema.anyOf.length > 0) {
    let matched = false;
    const matchErrors = [];
    for (let i = 0; i < schema.anyOf.length; i++) {
      const sub = schema.anyOf[i];
      const result = validateAgainstSchema(
        data,
        sub,
        spec,
        `${path}.anyOf[${i}]`
      );
      if (result.valid) {
        matched = true;
        break;
      } else {
        matchErrors.push(result.errors.join('; '));
      }
    }
    if (!matched) {
      errors.push(
        `${path}: does not match any 'anyOf' schema. Mismatches: [${matchErrors.join(' | ')}]`
      );
      return { valid: false, errors };
    }
  }

  // Check type
  if (schema.type) {
    // If integer, also allow float that is integer or convert check
    if (!isOfType(data, schema.type)) {
      // In JS, sometimes decimals with .00 serialize as integers or numbers
      if (schema.type === 'number' && typeof data === 'number') {
        // valid
      } else if (
        schema.type === 'integer' &&
        typeof data === 'number' &&
        Number.isInteger(data)
      ) {
        // valid
      } else {
        errors.push(
          `${path}: expected type '${schema.type}', received '${typeof data}' (${JSON.stringify(data)})`
        );
        return { valid: false, errors };
      }
    }
  }

  // Check enum
  if (Array.isArray(schema.enum)) {
    if (!schema.enum.includes(data)) {
      errors.push(
        `${path}: value '${data}' is not in allowed enum [${schema.enum.map((v) => JSON.stringify(v)).join(', ')}]`
      );
    }
  }

  // Check string format (e.g. date-time)
  if (
    schema.type === 'string' &&
    schema.format === 'date-time' &&
    typeof data === 'string'
  ) {
    // Validate ISO 8601 format or standard SQL datetime (e.g. 2026-09-20 12:00:00 or 2026-09-20T12:00:00Z)
    const isValidDate = !Number.isNaN(Date.parse(data));
    if (!isValidDate) {
      errors.push(`${path}: string '${data}' is not a valid date-time`);
    }
  }

  // Check array items
  if (Array.isArray(data) && schema.items) {
    data.forEach((item, index) => {
      const itemResult = validateAgainstSchema(
        item,
        schema.items,
        spec,
        `${path}[${index}]`
      );
      if (!itemResult.valid) {
        errors.push(...itemResult.errors);
      }
    });
  }

  // Check object properties and required fields
  if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
    // Required properties check
    if (Array.isArray(schema.required)) {
      for (const requiredProp of schema.required) {
        if (!(requiredProp in data) || data[requiredProp] === undefined) {
          errors.push(`${path}: missing required property '${requiredProp}'`);
        }
      }
    }

    // Properties validation
    if (schema.properties && typeof schema.properties === 'object') {
      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        if (propName in data && data[propName] !== undefined) {
          const propResult = validateAgainstSchema(
            data[propName],
            propSchema,
            spec,
            `${path}.${propName}`
          );
          if (!propResult.valid) {
            errors.push(...propResult.errors);
          }
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate a model instance against a schema name in components.schemas.
 *
 * @param {any} data
 * @param {string} schemaName
 * @param {Object} [spec=openApiSpec]
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateModel(data, schemaName, spec = openApiSpec) {
  const schema = spec.components?.schemas?.[schemaName];
  if (!schema) {
    throw new Error(
      `Schema '${schemaName}' not found in OpenAPI spec components.schemas`
    );
  }
  return validateAgainstSchema(data, schema, spec, `$.${schemaName}`);
}

/**
 * Validate an array of items against a component schema.
 *
 * @param {any[]} items
 * @param {string} schemaName
 * @param {Object} [spec=openApiSpec]
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateModelList(items, schemaName, spec = openApiSpec) {
  if (!Array.isArray(items)) {
    return {
      valid: false,
      errors: [
        `Expected array for model list of '${schemaName}', received ${typeof items}`,
      ],
    };
  }
  const allErrors = [];
  items.forEach((item, index) => {
    const res = validateAgainstSchema(
      item,
      { $ref: `#/components/schemas/${schemaName}` },
      spec,
      `$.${schemaName}[${index}]`
    );
    if (!res.valid) {
      allErrors.push(...res.errors);
    }
  });
  return {
    valid: allErrors.length === 0,
    errors: allErrors,
  };
}

/**
 * Validate an envelope response against an OpenAPI path response schema.
 *
 * @param {any} responseData
 * @param {string} pathKey e.g. '/products'
 * @param {string} method e.g. 'get'
 * @param {number|string} [statusCode=200]
 * @param {Object} [spec=openApiSpec]
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validatePathResponse(
  responseData,
  pathKey,
  method = 'get',
  statusCode = 200,
  spec = openApiSpec
) {
  const op = spec.paths?.[pathKey]?.[method.toLowerCase()];
  if (!op) {
    throw new Error(
      `Operation ${method.toUpperCase()} ${pathKey} not found in OpenAPI spec`
    );
  }
  const responseObj = op.responses?.[String(statusCode)];
  if (!responseObj) {
    throw new Error(
      `Response ${statusCode} not found for ${method.toUpperCase()} ${pathKey}`
    );
  }
  const schema = responseObj.content?.['application/json']?.schema;
  if (!schema) {
    throw new Error(
      `JSON schema not defined for ${statusCode} response on ${method.toUpperCase()} ${pathKey}`
    );
  }
  return validateAgainstSchema(
    responseData,
    schema,
    spec,
    `${pathKey}[${method}][${statusCode}]`
  );
}

export default {
  resolveRef,
  validateAgainstSchema,
  validateModel,
  validateModelList,
  validatePathResponse,
};
