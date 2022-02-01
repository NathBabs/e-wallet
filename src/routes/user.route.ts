import express from 'express';
const router = express.Router();

// import auth middleware
import { auth } from '../middleware/auth';
//import validate request middleware
import validate from '../middleware/validateRequest';
//import create user schema
import { createUserSchema } from '../schema/user.schema';
// import user controller
import { registerUser, login, logout } from '../controllers/user.controller'


// register user and create account
router.route('/wallet/register').post(validate(createUserSchema), registerUser);
// login user
router.route('/wallet/login').post(login)

// logout user
router.route('/wallet/logout').post(auth, logout)


module.exports = router;