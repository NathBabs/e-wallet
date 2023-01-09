import { NextFunction, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import currency from 'currency.js';
import { CreateUserInput, LoginUserInput } from '../schema/user.schema';
import { generateToken } from '../utils/generateAuthToken';

import prisma from '../../client';
import logger from '../utils/logger';
import { loginUser } from '../services/user.service';

export const registerUser = async (
  req: Request<{}, {}, CreateUserInput['body']>,
  res: Response
) => {
  try {
    let { password, email, balance } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    password = hashedPassword;
    // format balance to 2 decimal float
    balance = currency(balance).value;
    const userData = {
      data: {
        email: email,
        password: password,
        account: {
          create: {
            balance: balance,
          },
        },
      },
    };

    //check if email exists
    const exists = await prisma.user.findUnique({
      where: {
        email: email,
      },
    });

    if (exists) {
      return res.status(409).send({
        success: false,
        message: 'This email already exists',
      });
    }

    // create account upon creation of user
    const user = await prisma.user.create({
      ...userData,
      include: {
        account: {
          select: {
            accNumber: true,
            balance: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).send({
        success: false,
        message: 'User could not be created',
      });
    }

    const token = await generateToken(user);

    const { password: userpwd, tokens, updated_at, created_at, ...rest } = user;

    return res.status(201).send({
      success: true,
      message: `Your account has been created successfully. Here is your A/C No ${user?.account?.accNumber}`,
      data: {
        token: token,
        user: rest,
      },
    });
  } catch (error: any) {
    logger.error(error.message);
    return res.status(500).send({
      success: false,
      error: error.message,
    });
  }
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

export const logout = async (req: Request, res: Response) => {
  try {
    // return a filtered token array that doesn't contain the current token being returned from the auth.js file
    req.user.tokens = req.user.tokens.filter(token => {
      return token.token != req.token;
    });

    // save the modified user token
    await prisma.user.update({
      data: {
        tokens: req.user.tokens,
      },
      where: {
        id: req.user.id,
      },
    });

    return res.status(200).send({
      success: true,
      message: 'You have successfully logged out',
    });
  } catch (error) {
    res.status(500).send(error);
  }
};
