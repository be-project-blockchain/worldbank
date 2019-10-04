/*
SPDX-License-Identifier: Apache-2.0
*/

'use strict';

// Fabric smart contract classes
const { Contract, Context } = require('fabric-contract-api');

// worldbank specific classes
const BankAccount = require('./bankaccount.js');
const BankAccountList = require('./bankaccountlist.js');

/**
 * custom context to get easy access for all bank accounts
 */
class BankAccountContext extends Context {
    constructor() {
        super();
        // All bank accounts are held in a list of bank accounts
        this.bankAccountList = new BankAccountList(this);
    }
}

class BankAccountContract extends Contract {
    constructor() {
        // unique name when multiple contracts per chaincode file
        super('org.worldbank.bankaccount');
    }

    /**
     * Define custom context for bank account
     */
    createContext() {
        return new BankAccountContext();
    }

    /**
     * Instantiate to perform any setup of the ledger that might be required.
     * @param {Context} ctx the transaction context
     */
    async instantiate(ctx) {
        // No implementation required with this example
        // It could be where data migration is performed, if necessary
        console.log('Instantiate the bank account contract');
    }

   /**
    * 
    * @param {Context} ctx 
    * @param {String} bankName 
    * @param {String} accountNo 
    * @param {String} name 
    * @param {String} balance 
    */
    async createAccount(ctx, bankName, accountNo, name, balance) {
        // create an instance of BankAccount
        let bankAccount = BankAccount.createInstance(bankName, accountNo, name, balance);

        // activate account
        bankAccount.activateAccount();

        // Add the account to the list of all similar bank accounts in ledger world state
        await ctx.bankAccountList.addBankAccount(bankAccount);
    
        // returns a serialized bank account to caller of smart contract
        return bankAccount;
    }

    /**
     * 
     * @param {Context} ctx 
     * @param {String} senderBankName 
     * @param {String} senderAccountNo 
     * @param {String} receiverBankName 
     * @param {String} receiverAccountNo 
     * @param {String} amount 
     */
    async transferFund(ctx, senderBankName, senderAccountNo, receiverBankName, receiverAccountNo, amount) {
        // ToDo: validate wheather bank have permission to transfer amount from senders account

        // retrieve senders accounts by key fields provided
        let senderBankAccountKey = BankAccount.makeKey([senderBankName, senderAccountNo]);
        let senderBankAccount = await ctx.bankAccountList.getBankAccount(senderBankAccountKey);

        // retrieve receivers account by key fields provided
        let receiverBankAccountKey = BankAccount.makeKey([receiverBankName, receiverAccountNo]);
        let receiverBankAccount = await ctx.bankAccountList.getBankAccount(receiverBankAccountKey);

        // check for senders sufficient balance
        if(senderBankAccount.getBalance() < amount) {
            throw new Error('sender do not have sufficient balance for transfer');
        }

        // transfer amount from sender to receiver
        let newSenderBalance = String(Number(senderBankAccount.getBalance()) - Number(amount));
        senderBankAccount.setBalance(newSenderBalance);
        let newReceiverBalance = String(Number(receiverBankAccount.getBalance()) + Number(amount));
        receiverBankAccount.setBalance(newReceiverBalance);
        
        // update both the accounts into world state
        await ctx.bankAccountList.updateBankAccount(senderBankAccount);
        await ctx.bankAccountList.updateBankAccount(receiverBankAccount);

        // return senders bank account
        return senderBankAccount;       
    }

    async viewBalance(bankName, bankAccountNo) {
        // ToDo: validate wheather bank have permission to transfer amount from senders account

        // retrieve the current bank account using key fields provided
        let bankAccountKey = BankAccount.makeKey([bankName, bankAccountNo]);
        let bankAccount = await ctx.bankAccountList.getBankAccount(bankAccountKey);

        // return serialized balace of account object
        return bankAccount;

    }
}

module.exports = BankAccountContract;