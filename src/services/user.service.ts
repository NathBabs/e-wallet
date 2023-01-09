import prisma from '../../client';
import logger from '../utils/logger';
import bcrypt from 'bcryptjs';
import currency from 'currency.js';
import { AppError, StatusCode } from '../exceptions/AppError';
import { generateToken } from '../utils/generateAuthToken';

export async function loginUser({
  email,
  password,
}: {
  email: string;
  password: string;
}) {
  try {
    const user = await prisma.user.findUnique({
      where: {
        email: email,
      },
    });

    if (!user) {
      throw new AppError({
        statusCode: StatusCode.NOT_FOUND,
        description: 'Wrong username or password',
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      throw new AppError({
        statusCode: StatusCode.NOT_FOUND,
        description: 'Wrong username or password',
      });
    }

    const token = await generateToken(user);

    return {
      statusCode: StatusCode.OK,
      data: {
        token: token,
        userId: user.id,
      },
    };
  } catch (error: any) {
    logger.error(
      `::: Error [${JSON.stringify(
        error
      )}] while user with email ${email} was signing :::`
    );
    throw new AppError({
      statusCode: StatusCode.BAD_REQUEST,
      description: error?.message || 'Something went wrong',
    });
  }
}
