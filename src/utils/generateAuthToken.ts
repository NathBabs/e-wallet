import { sign } from 'jsonwebtoken';
import { user } from '.prisma/client';
import logger from './logger';
import prisma from '../../client';

export const generateToken = async (instance: user): Promise<string> => {
  try {
    const token = sign(
      {
        id: instance.id.toString(),
      },
      process.env.JWT_SECRET as string,
      {
        expiresIn: '7d',
      }
    );

    const USER = await prisma.user.update({
      where: {
        id: instance.id,
      },
      data: {
        tokens: {
          push: token,
        },
      },
    });

    return token;
  } catch (error) {
    logger.error(error);
    throw new Error('Could not generate token');
  }
};
