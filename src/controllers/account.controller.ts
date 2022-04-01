import { Request, Response, NextFunction } from 'express';
import currency from 'currency.js';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();
import { user, account } from '.prisma/client';
import { transfer } from '../utils/transfer';
import { databaseResponseTimeHistogram } from '../utils/metrics';


export const transferMoney = async (req: Request, res: Response) => {
    const metricsLabel = {
        operation: 'transferMoney'
    };
    const timer = databaseResponseTimeHistogram.startTimer();

    try {
        // since we already have an authorized user
        // all we need is the destination account and amount
        let { to, amount } = req.body;
        // get user.id from req.user
        // this {from} is  {user.id} which {userId} on table account
        let from = Number(req.user.id);
        // this {to} is an accNumber
        to = Number(to);

        // check if destination account exists
        const receiverAccount = await prisma.account.findUnique({
            where: {
                accNumber: to
            }
        });

        if (!receiverAccount) {
            return res.status(404).send({
                success: false,
                message: "Sorry destination account does not exist"
            })
        }


        // perform the transfer
        const transaction = await transfer(from, to, amount, 'transfer');
        timer({ ...metricsLabel, success: 'true' })

        // send the transaction back to client
        return res.status(200).send({
            success: true,
            data: {
                transactionReference: transaction.txRef
            }
        })
    } catch (error: any) {
        timer({ ...metricsLabel, success: 'false' })
        console.error(error)
        return res.status(500).send({
            success: false,
            message: 'Something went wrong',
            error: error.message
        })
    }
}


// TODO: Add refund to the initial transaction txRef string and use it as it's own txRef
// e.g txRef = jghd87645df , refund's txRef = refundjghd87645df or refund_jghd87645df <==  i think this better
// TODO: And also add an optional field called refundRef => this field will reference the initial transaction
// so we will have txRef => compulsory and refundRef => optional

export const refundMoney = async (req: Request, res: Response) => {
    try {
        // TODO: get the txRef from the req.body , make sure it's a protected route
        // a refund will be initiated by the receiver
        // receiver has to be logged in
        // get his user.id and serach for as transaction where he is the receiverId
        let txRef = req.body.txRef
        // it is the logged in user that is initiating a refund
        let from = req.user.id;
        // these two conditions must be met, to ensure the user is not inintiating the refund for another transaction
        // that they are not a party of
        //console.log('hereeeeeeeeeeeeee======', await prisma.transactions.findMany({}))
        const tx = await prisma.transactions.findFirst({
            where: {
                txRef: txRef,
                receiverId: from
            }
        });

        if (!tx) {
            return res.status(404).send({
                success: false,
                message: `Sorry you can't refund this transaction of Reference: ${txRef}`
            });
        }
        ;

        //console.log('tx from acc controller: ' + txRef)
        // get the senderId{accNumber} which will be the {to} in a refund transaction
        let to = Number(tx.senderId)

        // initiate a trasfer
        const refund = await transfer(from, to, tx.amount, 'refund', txRef)

        return res.status(200).send({
            success: true,
            message: `Refund has been completed here is the Transaction Refrence: ${refund.txRef}`
        })

    } catch (error: any) {
        console.error(error);
        return res.status(500).send({
            success: false,
            message: 'Something went wrong with the refund',
            error: error.message
        })
    }
}


// TODO: parse amount with currency when depositing
export const deposit = async (req: Request, res: Response) => {
    const metricsLabel = {
        operation: 'depositMoney'
    };
    const timer = databaseResponseTimeHistogram.startTimer();
    try {
        const userId = Number(req.user.id)
        const amount = currency(req.query.amount).value;

        // Get account that belongs to user
        const account: account = await prisma.account.update({
            data: {
                balance: {
                    increment: amount
                }
            },
            where: {
                userId: userId
            },
            include: {
                user: {
                    select: {
                        email: true
                    }
                }
            }
        });

        if (!account) {
            return res.status(404).send('sorry you dont have an account');
        }

        timer({ ...metricsLabel, success: 'true' })

        return res.status(200).send({
            success: true,
            message: `Your account has been credited with ${amount}, this is your new balance ${account.balance}`
        })
    } catch (error: any) {
        timer({ ...metricsLabel, success: 'false' })
        return res.status(500).send({
            success: false,
            message: `Sorry couldn't process your deposit`,
            error: error.message
        })
    }
}

//TODO: check balance is nnot less than zero
export const withdraw = async (req: Request, res: Response) => {
    const metricsLabel = {
        operation: 'withdrawMoney'
    };
    const timer = databaseResponseTimeHistogram.startTimer();
    try {
        const userId = Number(req.user.id)
        const amount = currency(req.query.amount).value;
        //const balance = await withdrawMoney(userId, amount);

        // Get account that belongs to user
        const account = await prisma.account.findUnique({
            where: {
                userId: userId
            },
            include: {
                user: {
                    select: {
                        email: true
                    }
                }
            }
        });

        const balance = currency(account?.balance).subtract(amount).value;

        if (balance < 0) {
            throw new Error('Insufficient balance');
        }

        prisma.account.update({
            data: {
                balance: {
                    set: balance
                }
            },
            where: {
                userId: userId
            }
        })

        timer({ ...metricsLabel, success: 'true' })

        return res.status(200).send({
            success: true,
            message: `Withdrawal successfull. Your new balance is now at ${balance}`,
            data: {
                amount: amount
            }
        })
    } catch (error: any) {
        console.log(error);
        timer({ ...metricsLabel, success: 'false' })
        return res.status(500).send({
            success: false,
            message: `Sorry couldn't process your withdrawal`,
            error: error.message
        })
    }
}

//TODO: Get account balance
export const getAccountBalance = async (req: Request, res: Response) => {
    const metricsLabel = {
        operation: 'getAccountBalance'
    };
    const timer = databaseResponseTimeHistogram.startTimer();
    try {
        const userId = Number(req.user.id);

        const account = await prisma.account.findUnique({
            where: {
                userId: userId
            }
        });

        if (!account) {
            return res.status(404).send('Sorry account not found')
        }

        timer({ ...metricsLabel, success: 'true' })

        return res.status(200).send({
            success: true,
            balance: `Your account balance is ${account.balance}`
        })
    } catch (error: any) {
        timer({ ...metricsLabel, success: 'false' })
        return res.status(500).send({
            success: false,
            message: `Sorry couldn't fetch your account balance`,
            error: error.message
        })
    }
}


//TODO: get history of transactions on getAccountBalance
export const getTransactionHistory = async (req: Request, res: Response) => {
    const metricsLabel = {
        operation: 'getTransactionHistory'
    };
    const timer = databaseResponseTimeHistogram.startTimer();
    try {
        const userId = Number(req.user.id);


        // first get accNumber
        const account = await prisma.account.findUnique({
            where: {
                userId: userId
            }
        });

        if (!account) {
            return res.status(404).send('Sorry account not found')
        }

        // get transactions where user is either senderId or receiverId
        const history = await prisma.transactions.findMany({
            where: {
                OR: [
                    {
                        senderId: userId
                    },
                    {
                        receiverId: userId
                    }
                ]
            },
            orderBy: {
                created_at: 'desc'
            }
        });

        if (history.length == 0) {
            return res.status(404).send('There are no transactions on this account yet')
        }
        timer({ ...metricsLabel, success: 'true' })

        return res.status(200).send({
            success: true,
            data: {
                transactions: history
            }
        })
    } catch (error: any) {
        timer({ ...metricsLabel, success: 'false' })
        return res.status(500).send({
            success: false,
            message: `Sorry couldn't fetch your transactions`,
            error: error.message
        })
    }
}