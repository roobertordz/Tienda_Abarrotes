import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001'),
  jwtSecret: process.env.JWT_SECRET || 'default_secret_change_me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  store: {
    name: process.env.STORE_NAME || 'Abarrotes Don José',
    address: process.env.STORE_ADDRESS || 'Av. Insurgentes Sur 1234, Col. Del Valle, CDMX',
    rfc: process.env.STORE_RFC || 'XAXX010101000',
    phone: process.env.STORE_PHONE || '55-1234-5678',
  },
};
