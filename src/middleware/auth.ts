import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../../client';
import logger from '../utils/logger';

type decodedPayload = {
  id: string;
  iat: number;
  exp: number;
};

type decodedExpPayload = {
  header: {
    alg: string;
    typ: string;
  };
  payload: decodedPayload;
  signature: string;
};

export const auth = async (req: Request, res: Response, next: NextFunction) => {
  let token = req.header('Authorization')?.replace('Bearer', '');
  token = token?.trim();
  try {
    if (!token) {
      throw new Error('Please sign in');
    }
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as decodedPayload;

    const user = await prisma.user.findFirst({
      where: {
        id: +decoded.id,
        tokens: {
          has: token.toString(),
        },
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    //since this method has already found the user, there's no need for the route handler to start finding the user again.
    req.token = token;
    req.user = user;
    next();
  } catch (error: any) {
    logger.error(error);
    if (error.message == 'jwt expired') {
      // @ts-ignore
      const decodedExp = jwt.decode(token, {
        complete: true,
      }) as decodedExpPayload;
      const id = +decodedExp?.payload.id;
      const user = await prisma.user.findFirst({
        where: {
          id: id,
        },
      });

      if (!user) {
        return res.status(403).send({
          message: 'Please authenticate',
          error: error.message,
        });
      }

      const filteredTokens = user.tokens.filter(singleToken => {
        return singleToken != token;
      });

      await prisma.user.update({
        where: {
          id: id,
        },
        data: {
          tokens: filteredTokens,
        },
      });

      return res.status(401).send({
        message: 'expired',
      });
    }

    return res.status(403).send({
      message: 'You are not authorized',
      error: error.message,
    });
  }
};
