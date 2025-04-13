// import nanoid from 'nanoid';
// import { redisClient } from './redisClient.js';

// const user = {
//     name: 'John Doe',
//     email: 'johndoe@gmail.com',
//     password: 'password123'
// };
// const id = nanoid();
// const userKey = UserKeyById(id);
// const hashData = { id, name: user.name, email: user.email, password: user.password };
// const addResult = await redisClient.hSet(userkey, hashData);

// export const getKeyName = (...args) => `bites:${args.join(':')}`;

// export const UserKeyById = (id) => getKeyName('user', id);

// export const UserKeyByEmail = (email) => getKeyName('email', email);

// export const UserKeyByUsername = (username) => getKeyName('user', 'username', username);

// export const UserKeyByToken = (token) => getKeyName('user', 'token', token);
