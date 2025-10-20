import { signAccessToken } from './shared/utils/auth/jwt';

const token = signAccessToken({
  userId: 'test-user',
  email: 'test@example.com',
  role: 'customer'
});

console.log(token);
