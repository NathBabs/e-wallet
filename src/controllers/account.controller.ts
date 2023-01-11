import { Request, Response, NextFunction } from 'express';
import currency from 'currency.js';
import { user, account } from '.prisma/client';
//import { transfer } from '../utils/transfer'
import { databaseResponseTimeHistogram } from '../utils/metrics';
import { nanoid } from 'nanoid';
import prisma from '../../client';
import logger from '../utils/logger';
import {
  depositMoney,
  fetchAccountBalance,
  fetchTransactionHistory,
  refundMoney,
  transferMoney,
  withdrawMoney,
} from '../services/account.service';
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

export const refund = async (
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
  refundMoney({ txRef, from })
    .then(dataObj => {
      res.status(dataObj.statusCode).send({
        status: true,
        data: dataObj.data,
      });
    })
    .catch(e => next(e));
};

export const deposit = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = req.user?.id as number;
  const amount = Number(req.query.amount);

  depositMoney({ userId, amount })
    .then(dataObj => {
      res.status(dataObj.statusCode).send({
        status: true,
        data: dataObj.data,
      });
    })
    .catch(e => next(e));
};

export const withdraw = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = req.user?.id as number;
  const amount = Number(req.query.amount);

  withdrawMoney({ userId, amount })
    .then(dataObj => {
      res.status(dataObj.statusCode).send({
        status: true,
        data: dataObj.data,
      });
    })
    .catch(e => next(e));
};

export const getAccountBalance = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = req.user?.id as number;

  fetchAccountBalance(userId)
    .then(dataObj => {
      res.status(dataObj.statusCode).send({
        status: true,
        data: dataObj.data,
      });
    })
    .catch(e => next(e));
};

export const getTransactionHistory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = req.user?.id as number;

  fetchTransactionHistory(userId)
    .then(dataObj => {
      res.status(dataObj.statusCode).send({
        status: true,
        data: dataObj.data,
      });
    })
    .catch(e => next(e));
};
