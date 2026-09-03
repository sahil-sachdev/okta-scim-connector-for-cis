export async function getGroups(oktaClient) {
  return oktaClient.getAll('/api/v1/groups');
}
