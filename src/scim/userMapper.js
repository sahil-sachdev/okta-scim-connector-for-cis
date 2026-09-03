export const SCIM_USER_SCHEMA = 'urn:ietf:params:scim:schemas:core:2.0:User';

export function mapOktaUserToScim(user) {
  const profile = user.profile || {};
  const emails = [];

  if (profile.email) {
    emails.push({
      value: profile.email,
      primary: true
    });
  }

  return {
    schemas: [SCIM_USER_SCHEMA],
    id: user.id,
    externalId: user.id,
    userName: profile.login || user.id,
    active: user.status === 'ACTIVE',
    name: {
      ...(profile.firstName ? { givenName: profile.firstName } : {}),
      ...(profile.lastName ? { familyName: profile.lastName } : {})
    },
    ...(emails.length > 0 ? { emails } : {})
  };
}

export function applyUserFilter(users, filter) {
  if (!filter) {
    return users;
  }

  const match = filter.match(/^userName\s+eq\s+"([^"]*)"$/i);
  if (!match) {
    return null;
  }

  return users.filter((user) => user.userName === match[1]);
}
