import currency from 'currency.js';
import { user, account } from '.prisma/client';
import { transfer } from '../utils/transfer';
import { databaseResponseTimeHistogram } from '../utils/metrics';
import { nanoid } from 'nanoid';
import prisma from '../../client';
import logger from '../utils/logger';
import { OK } from '../utils/status';
import { AppError, StatusCode } from '../exceptions/AppError';

export async function transferMoney({
  to,
  amount,
  from,
}: {
  to: number;
  amount: number;
  from: number;
}) {
  const metricsLabel = {
    operation: 'transferMoney',
  };
  const timer = databaseResponseTimeHistogram.startTimer();
  try {
    // check if destination account exists
    const receiverAccount = await prisma.account.findUnique({
      where: {
        accNumber: to,
      },
    });

    if (!receiverAccount) {
      throw new AppError({
        statusCode: StatusCode.NOT_FOUND,
        description: 'Destination account does not exist',
      });
    }

    // perform the transfer
    const transaction = await transfer(from, to, Number(amount), 'transfer');

    // get balance
    const account = await prisma.account.findUnique({
      where: {
        userId: from,
      },
    });
    timer({ ...metricsLabel, success: 'true' });

    // send the transaction back to client
    return {
      statusCode: OK,
      data: {
        transactionReference: transaction.txRef,
        balance: account?.balance,
      },
    };
  } catch (error: any) {
    timer({ ...metricsLabel, success: 'false' });
    logger.error(error);
    throw new AppError({
      statusCode: error?.statusCode || StatusCode.BAD_REQUEST,
      description: error?.message || 'Something went wrong',
    });
  }
}
