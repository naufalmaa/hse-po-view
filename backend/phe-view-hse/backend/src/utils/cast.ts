// utils/cast.ts
function isTypeSchema(val: unknown): val is { type: string; anyOf?: any[] } {
  return typeof val === 'object' && val !== null && ('type' in val || 'anyOf' in val);
}

function getActualType(val: any): string | null {
  // Handle direct type
  if (val.type) return val.type;
  
  // Handle Type.Optional which creates anyOf structure
  if (val.anyOf && Array.isArray(val.anyOf)) {
    for (const option of val.anyOf) {
      if (option.type && option.type !== 'null') {
        return option.type;
      }
    }
  }
  
  return null;
}

export function extractIntegerFieldsFromSchema(schema: any): string[] {
  return Object.entries(schema?.properties || {})
    .filter(([_, val]) => {
      if (!isTypeSchema(val)) return false;
      const actualType = getActualType(val);
      return actualType === 'integer';
    })
    .map(([key]) => key);
}

export function extractBooleanFieldsFromSchema(schema: any): string[] {
  
  const booleanFields = Object.entries(schema?.properties || {})
    .filter(([key, val]) => {
      if (!isTypeSchema(val)) {
        return false;
      }
      const actualType = getActualType(val);
      return actualType === 'boolean';
    })
    .map(([key]) => key);
  
  return booleanFields;
}

export function castFieldsWithSchema(
  raw: Record<string, any>,
  schema: any
): Record<string, any> {
  const result: Record<string, any> = {};
  const intFields = extractIntegerFieldsFromSchema(schema);
  
  // Hardcoded boolean fields from employee schema since Type.Intersect doesn't expose properties
  const boolFields = ['statusOnDuty', 'isPermanent'];

  for (const [key, val] of Object.entries(raw)) {
    if (intFields.includes(key)) {
      result[key] = val !== undefined ? Number(val) : null;
    } else if (boolFields.includes(key)) {
      // Handle boolean conversion from multipart form data (strings)
      if (val === 'true' || val === true) {
        result[key] = true;
      } else if (val === 'false' || val === false) {
        result[key] = false;
      } else {
        result[key] = null;
      }
    } else {
      result[key] = val ?? null;
    }
  }

  return result;
}
