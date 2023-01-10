import currency from 'currency.js';
import { user, account } from '.prisma/client';
import { transfer } from '../utils/transfer';
import { databaseResponseTimeHistogram } from '../utils/metrics';
import { nanoid } from 'nanoid';
import prisma from '../../client';
import logger from '../utils/logger';
import { OK, BAD_REQUEST, NOT_FOUND } from '../utils/status';
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
      statusCode: StatusCode.OK,
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

export async function refundMoney({
  txRef,
  from,
}: {
  txRef: string;
  from: number;
}) {
  try {
    const tx = await prisma.transactions.findFirst({
      where: {
        txRef: txRef,
        receiverId: from,
      },
    });

    if (!tx) {
      throw new AppError({
        statusCode: StatusCode.NOT_FOUND,
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
      statusCode: StatusCode.OK,
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

export async function depositMoney({
  userId,
  amount,
}: {
  userId: number;
  amount: number;
}) {
  const metricsLabel = {
    operation: 'depositMoney',
  };
  const timer = databaseResponseTimeHistogram.startTimer();
  try {
    if (isNaN(amount) || Number(amount) <= 0) {
      throw new AppError({
        statusCode: StatusCode.BAD_REQUEST,
        description: 'Invalid amount',
      });
    }

    amount = currency(amount).value;

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
      throw new AppError({
        statusCode: StatusCode.NOT_FOUND,
        description: 'Account does not exist',
      });
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
    logger.info(`::: account ${account.accNumber} credited with ${amount} :::`);

    return {
      statusCode: StatusCode.OK,
      data: {
        message: `Your account has been credited with ${amount}, this is your new balance ${account.balance}`,
        balance: account.balance,
      },
    };
  } catch (error: any) {
    logger.error(error);
    throw new AppError({
      statusCode: error?.statusCode || StatusCode.BAD_REQUEST,
      description: error?.message || 'Sorry could not process your deposit',
    });
  }
}

export async function withdrawMoney({
  userId,
  amount,
}: {
  userId: number;
  amount: number;
}) {
  const metricsLabel = {
    operation: 'withdrawMoney',
  };
  const timer = databaseResponseTimeHistogram.startTimer();
  try {
    userId = Number(userId);

    if (isNaN(amount) || Number(amount) <= 0) {
      throw new AppError({
        statusCode: StatusCode.BAD_REQUEST,
        description: 'Invalid amount',
      });
    }

    amount = currency(amount).value;

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

    const balance = currency(account?.balance as any).subtract(amount).value;

    if (balance < 0) {
      throw new AppError({
        statusCode: StatusCode.BAD_REQUEST,
        description: 'Insufficient balance',
      });
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
      throw new AppError({
        statusCode: StatusCode.NOT_FOUND,
        description: 'Account does not exist',
      });
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

    logger.info(
      `::: Withdrawal successfull. Your new balance is now at ${updatedAccount.balance} :::`
    );
    timer({ ...metricsLabel, success: 'true' });

    return {
      statusCode: StatusCode.OK,
      data: {
        balance: updatedAccount?.balance,
      },
    };
  } catch (error: any) {
    logger.error(error);
    throw new AppError({
      statusCode: error?.statusCode || StatusCode.BAD_REQUEST,
      description: error?.message || 'Sorry could not process your withdrawal',
    });
  }
}

export async function fetchAccountBalance(userId: number) {
  const metricsLabel = {
    operation: 'getAccountBalance',
  };
  const timer = databaseResponseTimeHistogram.startTimer();
  try {
    userId = Number(userId);

    const account = await prisma.account.findUnique({
      where: {
        userId: userId,
      },
    });

    if (!account) {
      throw new AppError({
        statusCode: StatusCode.NOT_FOUND,
        description: 'Sorry account not found',
      });
    }

    timer({ ...metricsLabel, success: 'true' });

    return {
      statusCode: StatusCode.OK,
      data: {
        balance: `${account.balance}`,
      },
    };
  } catch (error: any) {
    logger.error(error);
    throw new AppError({
      statusCode: error?.statusCode || StatusCode.BAD_REQUEST,
      description:
        error?.message || 'Sorry could not fetch your account balance',
    });
  }
}
