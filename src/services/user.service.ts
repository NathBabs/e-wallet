import prisma from '../../client';
import logger from '../utils/logger';
import bcrypt from 'bcryptjs';
import currency from 'currency.js';
import { AppError, StatusCode } from '../exceptions/AppError';
import { generateToken } from '../utils/generateAuthToken';

export async function registerUser({
  email,
  balance,
  password,
}: {
  email: string;
  balance: number;
  password: string;
}) {
  try {
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
      logger.error(`User with email ${email} already exists`);
      throw new AppError({
        statusCode: StatusCode.CONFLICT,
        description: 'Email already exists',
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
      throw new AppError({
        statusCode: StatusCode.BAD_REQUEST,
        description: 'Account could not be created',
      });
    }

    const token = await generateToken(user);

    const { password: userpwd, tokens, updated_at, created_at, ...rest } = user;
    logger.info(
      `Your account has been created successfully. Here is your A/C No ${user?.account?.accNumber}`
    );

    return {
      statusCode: StatusCode.OK,
      data: {
        token: token,
        user: rest,
      },
    };
  } catch (error: any) {
    logger.error(error);
    throw new AppError({
      statusCode: error?.statusCode || StatusCode.BAD_REQUEST,
      description: error?.message || 'Sorry could not complete sign up',
    });
  }
}

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
      )}] while user with email ${email} was logging in :::`
    );
    throw new AppError({
      statusCode: StatusCode.BAD_REQUEST,
      description: error?.message || 'Something went wrong',
    });
  }
}

export async function logoutUser({
  token,
  userId,
  tokensArray,
}: {
  token: string;
  userId: number;
  tokensArray: string[];
}) {
  try {
    const updatedTokensArray = tokensArray.filter(singleToken => {
      return singleToken !== token;
    });

    // save the modified user tokens array
    await prisma.user.update({
      data: {
        tokens: updatedTokensArray,
      },
      where: {
        id: userId,
      },
    });

    return {
      statusCode: StatusCode.OK,
    };
  } catch (error: any) {
    logger.error(error);
    throw new AppError({
      statusCode: error?.statusCode || StatusCode.BAD_REQUEST,
      description: error?.message || 'Sorry could not complete log out process',
    });
  }
}
