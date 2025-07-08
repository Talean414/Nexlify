import axios from 'axios';

export const fetchUserById = async (userId: string) => {
  try {
    const response = await axios.get(`http://auth-service:5001/api/users/${userId}`);
    return response.data?.user || null;
  } catch (error) {
    console.error('Error fetching user from auth-service:', error.message);
    return null;
  }
};