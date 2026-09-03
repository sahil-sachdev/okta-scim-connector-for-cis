export async function getUsers(oktaClient) {
  return oktaClient.getAll('/api/v1/users');
}
