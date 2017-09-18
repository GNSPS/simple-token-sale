/* eslint-env mocha */
/* global artifacts assert contract */

const HumanStandardToken = artifacts.require('./HumanStandardToken.sol');
const fs = require('fs');
const BN = require('bn.js');

const Sale = artifacts.require('./Sale.sol');
const Disbursement = artifacts.require('./Disbursement.sol');

contract('Sale', (accounts) => {
  const preBuyersConf = JSON.parse(fs.readFileSync('./conf/preBuyers.json'));
  const timelocksConf = JSON.parse(fs.readFileSync('./conf/timelocks.json'));
  const saleConf = JSON.parse(fs.readFileSync('./conf/sale.json'));
  const tokenConf = JSON.parse(fs.readFileSync('./conf/token.json'));
  const logs = JSON.parse(fs.readFileSync('./logs/logs.json'));
  const [owner, james, miguel] = accounts;

  let tokensForSale;

  /*
   * Utility Functions
   */

  async function purchaseToken(actor, amount) {
    if (!BN.isBN(amount)) { throw new Error('Supplied amount is not a BN.'); }
    const sale = await Sale.deployed();
    await sale.purchaseTokens({ from: actor, value: amount.mul(saleConf.price) });
  }

  async function getTokenBalanceOf(actor) {
    const sale = await Sale.deployed();
    const tokenAddr = await sale.token.call();
    const token = HumanStandardToken.at(tokenAddr);
    const balance = await token.balanceOf.call(actor);
    return new BN(balance.toString(10), 10);
  }

  function totalPreSoldTokens() {
    const preSoldTokens = Object.keys(preBuyersConf).map(curr =>
      new BN(preBuyersConf[curr].amount, 10));
    return preSoldTokens.reduce((sum, value) => sum.add(new BN(value, 10)), new BN(0, 10));
  }


  function getTranchesForBeneficiary(addr) {
    const beneficiary = timelocksConf[
      Object.keys(timelocksConf).find((beneficiaryIndex) => {
        const thisBeneficiary = timelocksConf[beneficiaryIndex];
        return thisBeneficiary.address === addr;
      })
    ];

    return beneficiary.tranches;
  }

  function getDisburserByBeneficiaryAndTranch(beneficiary, tranch) {
    const logForTranch = logs.find(log =>
      log.args.beneficiary === beneficiary.toLowerCase() &&
      log.args.amount === tranch.amount,
    );

    if (logForTranch === undefined) { throw new Error(`Missing disburser for ${beneficiary}`); }

    return Disbursement.at(logForTranch.args.disburser);
  }

  function getTimelockedBeneficiaries() {
    return Object.keys(timelocksConf).map(beneficiaryIndex =>
      timelocksConf[beneficiaryIndex],
    );
  }

  function totalTimelockedTokens() {
    function getDisburserTokenBalances() {
      let disburserTokenBalances = [];

      getTimelockedBeneficiaries().forEach((beneficiary) => {
        const tranches = getTranchesForBeneficiary(beneficiary.address);
        disburserTokenBalances = disburserTokenBalances.concat(
          Object.keys(tranches).map((tranchIndex) => {
            const tranch = tranches[tranchIndex];
            return tranch.amount;
          }),
        );
      });

      return disburserTokenBalances;
    }

    const timelockedTokens = getDisburserTokenBalances();

    return timelockedTokens.reduce((sum, value) => sum.add(new BN(value, 10)), new BN(0, 10));
  }

  function isEVMException(err) {
    return err.toString().includes('invalid opcode');
  }

  function as(actor, fn, ...args) {
    function detectSendObject(potentialSendObj) {
      function hasOwnProperty(obj, prop) {
        const proto = obj.constructor.prototype;
        return (prop in obj) &&
       (!(prop in proto) || proto[prop] !== obj[prop]);
      }
      if (typeof potentialSendObj !== 'object') { return undefined; }
      if (
        hasOwnProperty(potentialSendObj, 'from') ||
        hasOwnProperty(potentialSendObj, 'to') ||
        hasOwnProperty(potentialSendObj, 'gas') ||
        hasOwnProperty(potentialSendObj, 'gasPrice') ||
        hasOwnProperty(potentialSendObj, 'value')
      ) {
        throw new Error('It is unsafe to use "as" with custom send objects');
      }
      return undefined;
    }
    detectSendObject(args[args.length - 1]);
    const sendObject = { from: actor };
    return fn(...args, sendObject);
  }

  before(() => {
    const tokensPreAllocated = totalPreSoldTokens().add(totalTimelockedTokens());
    saleConf.price = new BN(saleConf.price, 10);
    saleConf.startBlock = new BN(saleConf.startBlock, 10);
    tokenConf.initialAmount = new BN(tokenConf.initialAmount, 10);
    tokensForSale = tokenConf.initialAmount.sub(tokensPreAllocated);
  });

  describe('Initial token issuance', () => {
    const wrongTokenBalance = 'has an incorrect token balance.';

    it('should instantiate preBuyers with the proper number of tokens', () =>
      Promise.all(
        Object.keys(preBuyersConf).map(async (curr) => {
          const tokenBalance =
            await getTokenBalanceOf(preBuyersConf[curr].address);
          const expected = preBuyersConf[curr].amount;
          const errMsg = `A pre-buyer ${wrongTokenBalance}`;
          assert.strictEqual(
            tokenBalance.toString(10), expected.toString(10), errMsg,
          );
        }),
      ),
    );

    it('should instantiate disburser contracts with the proper number of tokens', async () =>
      Promise.all(
        getTimelockedBeneficiaries().map(async (beneficiary) => {
          const beneficiaryTranches = getTranchesForBeneficiary(beneficiary.address);
          return Promise.all(
            Object.keys(beneficiaryTranches).map(async (tranchIndex) => {
              const tranch = beneficiary.tranches[tranchIndex];
              const disburser = getDisburserByBeneficiaryAndTranch(beneficiary.address, tranch);
              const tokenBalance = await getTokenBalanceOf(disburser.address);
              const expected = tranch.amount;
              const errMsg = `A disburser contract ${wrongTokenBalance}`;
              assert.strictEqual(
                tokenBalance.toString(10), expected.toString(10), errMsg,
              );
            }),
          );
        }),
      ),
    );

    it('should instantiate the public sale with the total supply of tokens ' +
       'minus the sum of tokens pre-sold.', async () => {
      const tokenBalance = await getTokenBalanceOf(Sale.address);
      const expected = tokensForSale.toString(10);
      const errMsg = `The sale contract ${wrongTokenBalance}`;
      assert.strictEqual(
        tokenBalance.toString(10), expected.toString(10), errMsg,
      );
    });
  });

  describe('Instantiation', () => {
    const badInitialization = 'was not initialized properly';

    it(`should instantiate with the price set to ${saleConf.price} Wei.`, async () => {
      const sale = await Sale.deployed();
      const price = await sale.price.call();
      const expected = saleConf.price;
      const errMsg = `The price ${badInitialization}`;
      assert.strictEqual(price.toString(10), expected.toString(10), errMsg);
    });

    it(`should instantiate with the owner set to ${saleConf.owner}.`, async () => {
      const sale = await Sale.deployed();
      const actualOwner = await sale.owner.call();
      const expected = saleConf.owner.toLowerCase();
      const errMsg = `The owner ${badInitialization}`;
      assert.strictEqual(actualOwner.valueOf(), expected, errMsg);
    });

    it(`should instantiate with the wallet set to ${saleConf.wallet}.`, async () => {
      const sale = await Sale.deployed();
      const wallet = await sale.wallet.call();
      const expected = saleConf.wallet;
      const errMsg = `The wallet ${badInitialization}`;
      assert.strictEqual(wallet.valueOf(), expected.toLowerCase(), errMsg);
    });

    it(`should instantiate with the startBlock set to ${saleConf.startBlock}.`, async () => {
      const sale = await Sale.deployed();
      const startBlock = await sale.startBlock.call();
      const expected = saleConf.startBlock;
      const errMsg = `The start block ${badInitialization}`;
      assert.strictEqual(
        startBlock.toString(10), expected.toString(10), errMsg,
      );
    });
  });

  describe('Owner-only functions', () => {
    const nonOwnerAccessError = 'A non-owner was able to';
    const ownerAccessError = 'An owner was unable able to';

    it('should not allow a non-owner to change the price.', async () => {
      const sale = await Sale.deployed();
      try {
        await as(james, sale.changePrice, saleConf.price + 1);
      } catch (err) {
        const errMsg = err.toString();
        assert(isEVMException(err), errMsg);
      }
      const price = await sale.price.call();
      const expected = saleConf.price;
      const errMsg = `${nonOwnerAccessError} change the price`;
      assert.strictEqual(price.toString(10), expected.toString(10), errMsg);
    });

    it('should not allow a non-owner to change the startBlock.', async () => {
      const sale = await Sale.deployed();
      try {
        await as(james, sale.startBlock, saleConf.startBlock + 1);
      } catch (err) {
        const errMsg = err.toString();
        assert(isEVMException(err), errMsg);
      }
      const startBlock = await sale.startBlock.call();
      const expected = saleConf.startBlock;
      const errMsg = `${nonOwnerAccessError} change the start block`;
      assert.strictEqual(startBlock.toString(10), expected.toString(10), errMsg);
    });

    it('should not allow a non-owner to change the owner', async () => {
      const sale = await Sale.deployed();
      try {
        await as(james, sale.owner, james);
      } catch (err) {
        const errMsg = err.toString();
        assert(isEVMException(err), errMsg);
      }
      const actualOwner = await sale.owner.call();
      const expected = saleConf.owner.toLowerCase();
      const errMsg = `${nonOwnerAccessError} change the owner`;
      assert.strictEqual(actualOwner.toString(), expected.toString(), errMsg);
    });

    it('should not allow a non-owner to change the wallet', async () => {
      const sale = await Sale.deployed();
      try {
        await as(james, sale.wallet, james);
      } catch (err) {
        const errMsg = err.toString();
        assert(isEVMException(err), errMsg);
      }
      const wallet = await sale.wallet.call();
      const expected = saleConf.wallet;
      const errMsg = `${nonOwnerAccessError} change the wallet`;
      assert.strictEqual(wallet.toString(), expected.toLowerCase(), errMsg);
    });

    it('should not allow a non-owner to activate the emergencyToggle', async () => {
      const sale = await Sale.deployed();
      try {
        await as(james, sale.emergencyToggle);
      } catch (err) {
        const errMsg = err.toString();
        assert(isEVMException(err), errMsg);
      }
      const emergencyFlag = await sale.emergencyFlag.call();
      const expected = false;
      const errMsg = `${nonOwnerAccessError} change the emergencyToggle`;
      assert.strictEqual(emergencyFlag, expected, errMsg);
    });

    it('should change the owner to miguel.', async () => {
      const sale = await Sale.deployed();
      await as(saleConf.owner, sale.changeOwner, miguel);
      const actualOwner = await sale.owner.call();
      const expected = miguel;
      const errMsg = `${ownerAccessError} change the owner`;
      assert.strictEqual(actualOwner, expected, errMsg);
      await as(miguel, sale.changeOwner, saleConf.owner);
    });

    it('should change the price to 2666.', async () => {
      const sale = await Sale.deployed();
      await as(owner, sale.changePrice, 2666);
      const price = await sale.price.call();
      const expected = 2666;
      const errMsg = `${ownerAccessError} change the price`;
      assert.strictEqual(price.toString(10), expected.toString(10), errMsg);
      await as(owner, sale.changePrice, saleConf.price);
    });

    it('should change the startBlock to 2666.', async () => {
      const sale = await Sale.deployed();
      await as(owner, sale.changeStartBlock, 2666);
      const price = await sale.startBlock.call();
      const expected = 2666;
      const errMsg = `${ownerAccessError} change the start block`;
      assert.strictEqual(price.toString(10), expected.toString(10), errMsg);
      await as(owner, sale.changeStartBlock, saleConf.startBlock);
    });

    it('should change the endBlock to 10000', async () => {
      const sale = await Sale.deployed();
      await as(owner, sale.changeEndBlock, 10000);
      const endBlock = await sale.endBlock.call();
      const expected = 10000;
      const errMsg = `${ownerAccessError} change the end block`;
      assert.strictEqual(endBlock.toString(10), expected.toString(10), errMsg);
    });

    it('should fail to change the endBlock to 1', async () => {
      const sale = await Sale.deployed();
      const originalEndBlock = await sale.endBlock.call();
      try {
        await as(owner, sale.changeEndBlock, 1);
      } catch (err) {
        const errMsg = err.toString();
        assert(isEVMException(err), errMsg);
      }
      const finalEndBlock = await sale.endBlock.call();
      const errMsg = 'endBlock less than startBlock should not be allowed';
      assert.strictEqual(originalEndBlock.toString(10), finalEndBlock.toString(10), errMsg);
    });

    it('should change the wallet address', async () => {
      const newWallet = '0x0000000000000000000000000000000000000001';
      const sale = await Sale.deployed();
      await as(owner, sale.changeWallet, newWallet);
      const wallet = await sale.wallet.call();
      const expected = newWallet;
      const errMsg = `${ownerAccessError} change the wallet address`;
      assert.strictEqual(wallet, expected, errMsg);
      await as(owner, sale.changeWallet, saleConf.wallet);
    });

    it('should activate the emergencyFlag.', async () => {
      const sale = await Sale.deployed();
      await as(owner, sale.emergencyToggle);
      const emergencyFlag = await sale.emergencyFlag.call();
      const expected = true;
      const errMsg = `${ownerAccessError} set the emergency toggle`;
      assert.strictEqual(emergencyFlag.valueOf(), expected, errMsg);
      await as(owner, sale.emergencyToggle);
    });
  });

  describe('Pre-sale period', () => {
    const earlyPurchaseError = ' was able to purchase tokens early';

    it('should reject a purchase from James.', async () => {
      const startingBalance = await getTokenBalanceOf(james);
      try {
        await purchaseToken(james, new BN('420', 10));
        const errMsg = james + earlyPurchaseError;
        assert(false, errMsg);
      } catch (err) {
        const errMsg = err.toString();
        assert(isEVMException(err), errMsg);
      }
      const finalBalance = await getTokenBalanceOf(james);
      const expected = startingBalance;
      const errMsg = james + earlyPurchaseError;
      assert.equal(
        finalBalance.toString(10), expected.toString(10), errMsg,
      );
    });
  });
});
