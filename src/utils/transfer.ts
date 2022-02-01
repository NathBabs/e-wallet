// TODO: refund is still a transfer , just that the Sender becomes the Receiver instead
import {nanoid} from 'nanoid';
import {PrismaClient, PrismaPromise} from '@prisma/client';

const prisma = new PrismaClient();

/**
 *
 * @param from - the id of the user making the transfer
 * @param to the destination account
 * @param amount the amount being transferred
 * @param type either a transfer or a refund
 * @param txRef transaction reference of the refund
 */
export const transfer = async function (from: number, to: number, amount: number, type: string, txRef?: string) {
    return await prisma.$transaction(async (prisma) => {
        //1. Decrement from the user sending amount
        const sender = await prisma.account.update({
            data: {
                balance: {
                    decrement: amount
                }
            },
            where: {
                userId: from
            },
            include: {
                user: true
            }
        })

        //2. verify the user's balance did not go below zero
        if (sender.balance < 0) {
            throw new Error(`This A/C number: ${sender.accNumber} does not have sufficient funds`)
        }

        //3. increase receivers balance
        const receiver = await prisma.account.update({
            data: {
                balance: {
                    increment: amount
                }
            },
            where: {
                accNumber: to
            },
            include: {
                user: true
            }
        })

        if (type === 'refund') {
            // append 'refund' to the txRef and use it as the present txRef
            const transactionRef = `refund${txRef}`

            const transaction = prisma.transactions.create({
                data: {
                    txRef: transactionRef,
                    refundRef: txRef,
                    amount: amount,
                    senderId: sender.accNumber,
                    receiverId: receiver.accNumber,
                }
            })

            return transaction;
        }

        //4. generate txRefs 
        const Ref = nanoid(12)

        //4. create a transaction and update the account
        const transactions = prisma.transactions.create({
            data: {
                txRef: Ref,
                senderId: sender.accNumber,
                receiverId: receiver.accNumber,
                amount: amount
            }
        })

        return transactions

    })
}