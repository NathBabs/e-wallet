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
      description: error?.message || 'Something went wrong with the transfer',
    });
  }
}

export async function refund({ txRef, from }: { txRef: string; from: number }) {
  try {
    const tx = await prisma.transactions.findFirst({
      where: {
        txRef: txRef,
        receiverId: from,
      },
    });

    if (!tx) {
      throw new AppError({
        statusCode: 404,
        description: `Sorry you can't refund this transaction of Reference: ${txRef}`,
      });
    }
    // get the senderId{accNumber} which will be the {to} in a refund transaction
    let to = Number(tx.senderId);

    // initiate a trasfer
    const refund = await transfer(from, to, tx.amount, 'refund', txRef);

    // update the initial transaction refundRef
    await prisma.transactions.update({
      where: {
        txRef: txRef,
      },
      data: {
        refundRef: refund.txRef,
      },
    });

    logger.info(
      `::: Refund of ${txRef} has been completed with transaction reference of ${refund?.txRef} :::`
    );

    return {
      statusCode: OK,
      data: {
        message: `Refund has been completed here is the Transaction Refrence: ${refund.txRef}`,
        transactionReference: refund?.txRef,
      },
    };
  } catch (error: any) {
    logger.error(error);
    throw new AppError({
      statusCode: error?.statusCode || StatusCode.BAD_REQUEST,
      description: error?.message || 'Something went wrong while refunding',
    });
  }
}
