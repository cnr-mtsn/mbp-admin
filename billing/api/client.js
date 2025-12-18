import client from '../lib/apolloClient';
import { LOGIN, REGISTER, FORGOT_PASSWORD, RESET_PASSWORD } from '../lib/graphql/mutations';

// ==================== AUTH API ====================

export const authAPI = {
  login: async (credentials) => {
    const { data } = await client.mutate({
      mutation: LOGIN,
      variables: credentials,
    });
    return { data: data.login };
  },

  register: async (userData) => {
    const { first_name, last_name, username, email, password } = userData;
    const name = `${first_name} ${last_name}`;
    const { data } = await client.mutate({
      mutation: REGISTER,
      variables: { name, email, password },
    });
    return { data: data.register };
  },

  forgotPassword: async (email) => {
    const { data } = await client.mutate({
      mutation: FORGOT_PASSWORD,
      variables: { email },
    });
    return { data: data.forgotPassword };
  },

  resetPassword: async ({ token, newPassword }) => {
    const { data } = await client.mutate({
      mutation: RESET_PASSWORD,
      variables: { token, newPassword },
    });
    return { data: data.resetPassword };
  },
};
