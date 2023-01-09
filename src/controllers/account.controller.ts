import { Request, Response, NextFunction } from 'express';
import currency from 'currency.js';
import { user, account } from '.prisma/client';
//import { transfer } from '../utils/transfer'
import { databaseResponseTimeHistogram } from '../utils/metrics';
import { nanoid } from 'nanoid';
import prisma from '../../client';
import logger from '../utils/logger';
import { refund, transferMoney } from '../services/account.service';
import { RefundMoneyInput, TransferMoneyInput } from '../schema/account.schema';

export const transferToAccount = async (
  req: Request<{}, {}, TransferMoneyInput['body']>,
  res: Response,
  next: NextFunction
) => {
  const id = req.user?.id as number;
  const { to, amount } = req.body;

  transferMoney({ to, amount, from: id })
    .then(dataObj => {
      res.status(dataObj.statusCode).send({
        status: true,
        data: dataObj.data,
      });
    })
    .catch(e => next(e));
};

export const refundMoney = async (
  req: Request<{}, {}, RefundMoneyInput['body']>,
  res: Response,
  next: NextFunction
) => {
  // a refund will be initiated by the receiver
  // receiver has to be logged in
  // get his user.id and serach for as transaction where he is the receiverId
  const { txRef } = req.body;
  // it is the logged in user that is initiating a refund
  const from = req.user?.id as number;
  // these two conditions must be met, to ensure the user is not inintiating the refund for another transaction
  // that they are not a party of
  refund({ txRef, from })
    .then(dataObj => {
      res.status(dataObj.statusCode).send({
        status: true,
        data: dataObj.data,
      });
    })
    .catch(e => next(e));
};

export const deposit = async (req: Request, res: Response) => {
  const metricsLabel = {
    operation: 'depositMoney',
  };
  const timer = databaseResponseTimeHistogram.startTimer();
  try {
    const userId = Number(req.user.id);

    if (isNaN(req.query.amount) || Number(req.query.amount) <= 0) {
      return res.status(500).send('Invalid amount');
    }
    const amount = currency(req.query.amount).value;

    // increment balance
    const account: account = await prisma.account.update({
      data: {
        balance: {
          increment: amount,
        },
      },
      where: {
        userId: userId,
      },
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    if (!account) {
      return res.status(404).send('sorry you do not have an account');
    }

    // create a deposit transaction
    await prisma.transactions.create({
      data: {
        txRef: `DEP-${nanoid(12)}`,
        refundRef: null,
        amount: amount,
        senderId: userId,
        receiverId: userId,
      },
    });

    timer({ ...metricsLabel, success: 'true' });

    return res.status(200).send({
      success: true,
      message: `Your account has been credited with ${amount}, this is your new balance ${account.balance}`,
      data: {
        balance: account.balance,
      },
    });
  } catch (error: any) {
    timer({ ...metricsLabel, success: 'false' });
    return res.status(500).send({
      success: false,
      message: `Sorry couldn't process your deposit`,
      error: error.message,
    });
  }
};

/**
 *
 * @param req
 * @param res
 * @returns
 */
export const withdraw = async (req: Request, res: Response) => {
  const metricsLabel = {
    operation: 'withdrawMoney',
  };
  const timer = databaseResponseTimeHistogram.startTimer();
  try {
    const userId = Number(req.user.id);

    if (isNaN(req.query.amount) || Number(req.query.amount) <= 0) {
      return res.status(500).send('Invalid amount');
    }

    const amount = currency(req.query.amount).value;

    // Get account that belongs to user
    const account = await prisma.account.findUnique({
      where: {
        userId: userId,
      },
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    const balance = currency(account?.balance).subtract(amount).value;

    if (balance < 0) {
      return res.status(500).send('Insufficient balance');
    }

    const updatedAccount: account = await prisma.account.update({
      data: {
        balance: {
          decrement: amount,
        },
      },
      where: {
        userId: userId,
      },
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    if (!updatedAccount) {
      return res.status(500).send('Account does not exist');
    }

    // create a withdrawal transaction
    await prisma.transactions.create({
      data: {
        txRef: `WDL-${nanoid(12)}`,
        refundRef: null,
        amount: amount,
        senderId: userId,
        receiverId: userId,
      },
    });

    timer({ ...metricsLabel, success: 'true' });

    return res.status(200).send({
      success: true,
      message: `Withdrawal successfull. Your new balance is now at ${updatedAccount.balance}`,
      data: {
        balance: updatedAccount.balance,
        amount: amount,
      },
    });
  } catch (error: any) {
    logger.error(error);
    timer({ ...metricsLabel, success: 'false' });
    return res.status(500).send({
      success: false,
      message: `Sorry couldn't process your withdrawal`,
      error: error.message,
    });
  }
};

/**
 * Get account balance
 * @param req
 * @param res
 * @returns
 */
export const getAccountBalance = async (req: Request, res: Response) => {
  const metricsLabel = {
    operation: 'getAccountBalance',
  };
  const timer = databaseResponseTimeHistogram.startTimer();
  try {
    const userId = Number(req.user.id);

    const account = await prisma.account.findUnique({
      where: {
        userId: userId,
      },
    });

    if (!account) {
      return res.status(404).send('Sorry account not found');
    }

    timer({ ...metricsLabel, success: 'true' });

    return res.status(200).send({
      success: true,
      balance: `${account.balance}`,
    });
  } catch (error: any) {
    timer({ ...metricsLabel, success: 'false' });
    return res.status(500).send({
      success: false,
      message: `Sorry couldn't fetch your account balance`,
      error: error.message,
    });
  }
};

//get history of transactions
export const getTransactionHistory = async (req: Request, res: Response) => {
  const metricsLabel = {
    operation: 'getTransactionHistory',
  };
  const timer = databaseResponseTimeHistogram.startTimer();
  try {
    const userId = Number(req.user.id);

    // first get accNumber
    const account = await prisma.account.findUnique({
      where: {
        userId: userId,
      },
    });

    if (!account) {
      return res.status(404).send('Sorry account not found');
    }

    // get transactions where user is either senderId or receiverId
    const history = await prisma.transactions.findMany({
      where: {
        OR: [
          {
            senderId: userId,
          },
          {
            receiverId: userId,
          },
        ],
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    if (history.length == 0) {
      return res
        .status(404)
        .send('There are no transactions on this account yet');
    }
    timer({ ...metricsLabel, success: 'true' });

    return res.status(200).send({
      success: true,
      data: {
        transactions: history,
      },
    });
  } catch (error: any) {
    logger.error(error);
    timer({ ...metricsLabel, success: 'false' });
    return res.status(500).send({
      success: false,
      message: `Sorry couldn't fetch your transactions`,
      error: error.message,
    });
  }
};
