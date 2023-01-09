import { object, string, number, InferType } from 'yup';

export const transferMoneySchema = object({
  body: object({
    to: number()
      .required('Account number is required')
      .positive('Account number must be a postive number')
      .min(1, 'Put in a valid account number'),
    amount: number()
      .required('Amount to transferis required')
      .positive('Amount must be a positive number')
      .min(1, 'Amount must be up to 1'),
  }),
});

export interface TransferMoneyInput
  extends InferType<typeof transferMoneySchema> {}
