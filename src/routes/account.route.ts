import express from 'express';
const router = express.Router();

// import auth middleware
import { auth } from '../middleware/auth';
// import account controller
import {
  transferToAccount,
  refund,
  deposit,
  withdraw,
  getAccountBalance,
  getTransactionHistory,
} from '../controllers/account.controller';
import validate from '../middleware/validateRequest';
import {
  refundMoneySchema,
  transferMoneySchema,
} from '../schema/account.schema';

// transfer money
// {to: accNumber, amount:6000}
router
  .route('/wallet/transfer')
  .post(validate(transferMoneySchema), auth, transferToAccount);

// refund money
// { txRef: 'kjyfviayef733 }
router.route('/wallet/refund').post(validate(refundMoneySchema), auth, refund);

// deposit money
// ?amount=50000
router.route('/wallet/deposit').post(auth, deposit);

// withdraw money
// ?amount=50000
router.route('/wallet/withdraw').post(auth, withdraw);

// get account balance
router.route('/wallet/balance').get(auth, getAccountBalance);

// get transaction history
router.route('/wallet/history').get(auth, getTransactionHistory);

module.exports = router;
