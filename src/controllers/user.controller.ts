import { NextFunction, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import currency from 'currency.js';
import { CreateUserInput, LoginUserInput } from '../schema/user.schema';
import { generateToken } from '../utils/generateAuthToken';

import prisma from '../../client';
import logger from '../utils/logger';
import { loginUser, logoutUser, registerUser } from '../services/user.service';

export const register = async (
  req: Request<{}, {}, CreateUserInput['body']>,
  res: Response,
  next: NextFunction
) => {
  const { email, balance, password } = req.body;

  registerUser({ email, balance, password })
    .then(dataObj => {
      res.status(dataObj.statusCode).send({
        status: true,
        data: dataObj.data,
      });
    })
    .catch(e => next(e));
};

// login user
export const login = async (
  req: Request<{}, {}, LoginUserInput['body']>,
  res: Response,
  next: NextFunction
) => {
  const { email, password } = req.body;

  loginUser({ email, password })
    .then(dataObj => {
      res.status(dataObj.statusCode).send({
        status: true,
        data: dataObj.data,
      });
    })
    .catch(e => next(e));
};

export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = req.user?.id as number;
  const token = req.token as string;
  const tokensArray = req.user?.tokens as [];

  logoutUser({ token, userId, tokensArray })
    .then(dataObj => {
      res.status(dataObj.statusCode).send({});
    })
    .catch(e => next(e));
};
