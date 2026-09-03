export const SCIM_LIST_SCHEMA = 'urn:ietf:params:scim:api:messages:2.0:ListResponse';
export const SCIM_ERROR_SCHEMA = 'urn:ietf:params:scim:api:messages:2.0:Error';

export function parsePagination(query = {}) {
  const startIndex = query.startIndex === undefined ? 1 : Number(query.startIndex);
  const count = query.count === undefined ? 100 : Number(query.count);

  if (!Number.isInteger(startIndex) || startIndex < 1) {
    throw scimError(400, 'startIndex must be an integer greater than or equal to 1');
  }

  if (!Number.isInteger(count) || count < 0) {
    throw scimError(400, 'count must be an integer greater than or equal to 0');
  }

  return { startIndex, count };
}

export function listResponse(resources, startIndex = 1, count = 100) {
  const start = startIndex - 1;
  const pagedResources = count === 0 ? [] : resources.slice(start, start + count);

  return {
    schemas: [SCIM_LIST_SCHEMA],
    totalResults: resources.length,
    startIndex,
    itemsPerPage: pagedResources.length,
    Resources: pagedResources
  };
}

export function scimError(status, detail, scimType) {
  const error = new Error(detail);
  error.status = status;
  error.scim = {
    schemas: [SCIM_ERROR_SCHEMA],
    status: String(status),
    detail,
    ...(scimType ? { scimType } : {})
  };
  return error;
}

export function sendScimError(res, status, detail, scimType) {
  return res.status(status).json({
    schemas: [SCIM_ERROR_SCHEMA],
    status: String(status),
    detail,
    ...(scimType ? { scimType } : {})
  });
}
