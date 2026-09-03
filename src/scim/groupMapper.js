export const SCIM_GROUP_SCHEMA = 'urn:ietf:params:scim:schemas:core:2.0:Group';

export function mapOktaGroupToScim(group) {
  return {
    schemas: [SCIM_GROUP_SCHEMA],
    id: group.id,
    externalId: group.id,
    displayName: group.profile?.name || group.id
  };
}

export function applyGroupFilter(groups, filter) {
  if (!filter) {
    return groups;
  }

  const match = filter.match(/^displayName\s+eq\s+"([^"]*)"$/i);
  if (!match) {
    return null;
  }

  return groups.filter((group) => group.displayName === match[1]);
}
