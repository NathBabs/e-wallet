# E-Wallet

This is a simple implementation of an E-Wallet platform that supports the  following features.
<br>

## Setup
To setup this application first
clone the repo
```
➜ git clone https://github.com/NathBabs/e-wallet.git

➜ cd e-wallet
```

next install dependencies
```
➜ npm install
```

create a `.env` file for environment variables

create the following variables in the `.env` file
```
DATABASE_URL=
PORT=
JWT_SECRET=
```

next run the following to start the server
```
➜ npm run dev
```

### Tests 
I have uploaded the `.env.test` for easier setup without hassle.
Just run.<br> 
```
➜ npm test
```
** ***Ensure you have docker running already.***
<br> <br> 

These are the routes you can call. <br>
** **For all protected routes, pass in the token to the Authorization header as Bearer [token] gotten from logging in or registering**

### *Register a new user*
**method** : `POST` <br>

🌎 ➜ `/wallet/register` <br>

payload
```
{
	"email": "babalola@gmail.com",
	"password": "nathaniel",
	"balance": 5000
}
```

response
```
{
	"success": true,
	"message": "Your account has been created successfully. Here is your A/C No 6",
	"data": {
		"token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjYiLCJpYXQiOjE2NDM0MTczMDAsImV4cCI6MTY0MzQyMDkwMH0.THSeL4ps2eYZLGSbkgauXoOU2D92KhhwrmNiyH-LuDs",
		"user": {
			"id": 6,
			"email": "babalola@gmail.com",
			"account": {
				"accNumber": 6,
				"balance": 5000
			}
		}
	}
}
```
<br> <br>

### *Login User*
**method** : `POST` <br>
🌎 ➜ `/wallet/login` <br>
payload
```
{
	"email": "babalola@gmail.com",
	"password": "nathaniel"
}
```

response
```
{
	"success": true,
	"message": "Successfully logged in",
	"data": {
		"token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjYiLCJpYXQiOjE2NDM1ODU1MjMsImV4cCI6MTY0MzU4OTEyM30.KImhEALfYMFrujbDiOm9Ubyd3nJqbz22pIe-zOoOZQ4"
	}
}
```

<br> <br>

### *Logout User*  `protected`
**method** : `POST` <br>
🌎 ➜ `/wallet/logout`

response
```
{
	"success": true,
	"message": "You have successfully logged out"
}
```
<br> <br>

### *Deposit Money* `protected`
**method** : `POST` <br>

🌎 ➜ `/wallet/deposit?amount=3000`

response
```
{
	"success": true,
	"message": "Your account has been credited with 3000, this is your new balance 4000",
	"data": {
	    "balance": 7000
	}
}
```
<br> <br>

### *Withdraw Money* `protected`
**method** : `POST` <br>

🌎 ➜ `/wallet/withdraw?amount=3000`

response
```
{
	"success": true,
	"message": "Withdrawal successfull. Your new balance is now at 49000",
	"data": {
		"balance": 7000,
		"amount": 1000,
	}
}
```

<br> <br>

### *Transfer Money* `protected`
**method** : `POST` <br>
🌎 ➜ `/wallet/transfer`

***to*** is the account you are transfering to<br>
***amount*** is how much you want to transafer

payload
```
{
	"to": 6,
	"amount": 900.00
}
```

response
```
{
	"success": true,
	"data": {
		"transactionReference": "gm1SzBI0qnYy",
		"balance": 7000
	}
}
```
<br> <br>

### *Initiate a refund transaction* `protected`

**method** : `POST` <br>
🌎 ➜ `/wallet/refund` <br>
***txRef*** is the transaction reference you want to refund 

payload
```
{
	"txRef": "gm1SzBI0qnYy"
}
```

response
```
{
	"success": true,
	"message": "Refund has been completed here is the Transaction Refrence: refundgm1SzBI0qnYy"
}
```

<br> <br>

### *Get Transaction History* `protected`
**method** : `GET` <br>
🌎 ➜ `/wallet/history`

response
```
{
	"success": true,
	"data": {
		"transactions": [
			{
				"id": 10,
				"txRef": "refundgm1SzBI0qnYy",
				"amount": 900,
				"refundRef": "gm1SzBI0qnYy",
				"senderId": 6,
				"receiverId": 4,
				"created_at": "2022-01-30T23:40:59.380Z",
				"updated_at": "2022-01-30T23:40:59.381Z"
			},
			{
				"id": 8,
				"txRef": "gm1SzBI0qnYy",
				"amount": 900,
				"refundRef": null,
				"senderId": 4,
				"receiverId": 6,
				"created_at": "2022-01-30T23:37:30.521Z",
				"updated_at": "2022-01-30T23:37:30.522Z"
			}
		]
	}
}
```

<br> <br>

### *Get Account Balance* `protected`
**method** : `GET` <br>
🌎 ➜ `/wallet/balance`

response
```
{
	"success": true,
	"balance": 49000
}
```
