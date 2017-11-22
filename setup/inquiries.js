const inquirer = require('inquirer');

const isHexAddress = str => /^0x[0-9A-Fa-f]{40}$/g.test(str);

const isSymbol = str => /^[A-Z]{3,}$/g.test(str);

module.exports = {
  confirmOverwrite: async () => {
    const question = [
      {
        name: 'overwrite',
        type: 'confirm',
        message: 'Are you sure you want to overwrite this file?',
        default: true,
      },
    ];

    const answer = await inquirer.prompt(question);

    return answer.overwrite;
  },

  confirmContinuing: async (loopName) => {
    const question = [
      {
        name: 'continue',
        type: 'confirm',
        message: `Do you want to add one more ${loopName}?`,
        default: true,
      },
    ];

    const answer = await inquirer.prompt(question);

    return answer.continue;
  },

  confirmSkipFile: async (fileName) => {
    const question = [
      {
        name: 'continue',
        type: 'confirm',
        message: `Do you want to modify the ${fileName} file interactively (this could also be done manually)?`,
        default: true,
      },
    ];

    const answer = await inquirer.prompt(question);

    return answer.continue;
  },

  tokenInquiries: [
    {
      name: 'tokenName',
      type: 'input',
      message: 'What do you want your token to be called (it\'s human readable name)?',
      validate: (value) => {
        if (value.length) {
          return true;
        }
        return 'Please enter a name for your token';
      },
    },
    {
      name: 'tokenSymbol',
      type: 'input',
      message: 'What do you want the symbol of your token to be? (Think something like ETH, BTC, ...)',
      validate: (value) => {
        if (isSymbol(value)) {
          return true;
        }
        return 'Please enter a symbol with 3 or more alphanumeric uppercase chars';
      },
    },
    {
      name: 'decimalUnits',
      type: 'input',
      message: 'How many decimal units do you want your token to have? (Standard is 18, like ETH, but your token can have less. :D)',
      validate: (value) => {
        if (!isNaN(parseInt(value, 10)) && parseInt(value, 10) >= 0) {
          return true;
        }
        return 'Please enter a numeric value bigger than or equal to 0';
      },
    },
    {
      name: 'initialAmount',
      type: 'input',
      message: 'What is the initial amount of tokens you wish to create? (This will be the total supply of tokens in circulation [in token units])',
      validate: (value) => {
        if (!isNaN(parseInt(value, 10)) && parseInt(value, 10) > 0) {
          return true;
        }
        return 'Please enter a numeric value bigger than 0';
      },
    },
  ],

  saleInquiries: [
    {
      name: 'owner',
      type: 'input',
      message: 'What is the public address of the "owner" of the token sale? (This is the account that has powers for stopping it, etc. [please append "0x" to the address])',
      validate: (value) => {
        if (isHexAddress(value)) {
          return true;
        }
        return 'Please enter a valid address prefixed by "0x"';
      },
    },
    {
      name: 'wallet',
      type: 'input',
      message: 'What is the public address of the receiving "wallet" for the token sale? (This is the account that will receive the proceeds of the token sale [please append "0x" to the address])',
      validate: (value) => {
        if (isHexAddress(value)) {
          return true;
        }
        return 'Please enter a valid address prefixed by "0x"';
      },
    },
    {
      name: 'price',
      type: 'input',
      message: 'What do you want to be the price of the token in Ether [not in Wei!]? (This is how much Ether one token of yours costs. And the total amount of Ether you will raise this way, if the max is reached, is going to equal `price * initialSupply`)',
      validate: (value) => {
        if (!isNaN(parseInt(value, 10)) && parseInt(value, 10) >= 0) {
          return true;
        }
        return 'Please enter a numeric value bigger than or equal to 0';
      },
    },
    {
      name: 'startBlock',
      type: 'input',
      message: 'What should be the start block for the token sale? (Please be attentive of Metropolis forks, try to avoid doing your token sale during the transition period where block times will be more unreliable)',
      validate: (value) => {
        if (!isNaN(parseInt(value, 10)) && parseInt(value, 10) > 0) {
          return true;
        }
        return 'Please enter a numeric value bigger than 0';
      },
    },
    {
      name: 'freezeBlock',
      type: 'input',
      message: 'What should be the freeze block for the token sale? (This is the block number on which the sale parameters will be frozen [to inspire more confidence to the end-user] and so this value should be less than the start block.)',
      validate: (value, answers) => {
        if (!isNaN(parseInt(value, 10)) && parseInt(value, 10) > 0 && parseInt(value, 10) < parseInt(answers.startBlock)) {
          return true;
        }
        return 'Please enter a numeric value bigger than 0 and smaller than `startBlock` (`freezeBlock` must always come first)';
      },
    },
    {
      name: 'endBlock',
      type: 'input',
      message: 'What should be the end block for the token sale? (This is the block number on which the sale will end no matter what. This value should be greater that the start block for obvious reasons.)',
      validate: (value, answers) => {
        if (!isNaN(parseInt(value, 10)) && parseInt(value, 10) > 0 && parseInt(value, 10) > parseInt(answers.startBlock)) {
          return true;
        }
        return 'Please enter a numeric value bigger than 0 and greater than `startBlock` (`endBlock` must always come later)';
      },
    },
  ],

  preBuyersInquiries: [
    {
      name: 'address',
      type: 'input',
      message: 'Please enter the address of the pre-buyer.',
      validate: (value) => {
        if (isHexAddress(value)) {
          return true;
        }
        return 'Please enter a valid address prefixed by "0x"';
      },
    },
    {
      name: 'amount',
      type: 'input',
      message: 'What amount of tokens will they get?',
      validate: (value) => {
        if (!isNaN(parseInt(value, 10)) && parseInt(value, 10) > 0) {
          return true;
        }
        return 'Please enter a numeric value bigger than 0';
      },
    },
  ],

  timelocksInquiries: [
    {
      name: 'address',
      type: 'input',
      message: 'Please enter the address of the vestee (or team member, probably!).',
      validate: (value) => {
        if (isHexAddress(value)) {
          return true;
        }
        return 'Please enter a valid address prefixed by "0x"';
      },
    },
  ],

  tranchesInquiries: [
    {
      name: 'date',
      type: 'input',
      message: 'Please enter the date on which the tranche is to be released. (In timestamp [seconds since Epoch] format)',
      validate: (value) => {
        if (!isNaN(parseInt(value, 10)) && parseInt(value, 10) > 0) {
          return true;
        }
        return 'Please enter a numeric value bigger than 0';
      },
    },
    {
      name: 'amount',
      type: 'input',
      message: 'Please enter the amount of tokens to be released on this tranche. (In your tokens denomination)',
      validate: (value) => {
        if (!isNaN(parseInt(value, 10)) && parseInt(value, 10) > 0) {
          return true;
        }
        return 'Please enter a numeric value bigger than 0';
      },
    },
    {
      name: 'period',
      type: 'input',
      message: 'Please enter the number of seconds on which to spread the vesting of this individual tranche.',
      validate: (value) => {
        if (!isNaN(parseInt(value, 10)) && parseInt(value, 10) > 0) {
          return true;
        }
        return 'Please enter a numeric value bigger than 0';
      },
    },
  ],

  easySetupInquiries: [
    {
      name: 'tokenName',
      type: 'input',
      message: 'What do you want your token to be called (it\'s human readable name)?',
      validate: (value) => {
        if (value.length) {
          return true;
        }
        return 'Please enter a name for your token';
      },
    },
    {
      name: 'tokenSymbol',
      type: 'input',
      message: 'What do you want the symbol of your token to be? (Think something like ETH, BTC, ...)',
      validate: (value) => {
        if (isSymbol(value)) {
          return true;
        }
        return 'Please enter a symbol with 3 or more alphanumeric uppercase chars';
      },
    },
    {
      name: 'raisedEth',
      type: 'input',
      message: 'How much money do you want to raise? (In Ether)',
      validate: (value) => {
        if (!isNaN(parseInt(value, 10)) && parseInt(value, 10) > 0) {
          return true;
        }
        return 'Please enter a numeric value bigger than 0';
      },
    },
    {
      name: 'initialAmount',
      type: 'input',
      message: 'How many tokens do you wish to create? (This will be the total supply of tokens in circulation [in token units])',
      validate: (value) => {
        if (!isNaN(parseInt(value, 10)) && parseInt(value, 10) > 0) {
          return true;
        }
        return 'Please enter a numeric value bigger than 0';
      },
    },
    {
      name: 'startBlock',
      type: 'input',
      message: 'When do you want the token sale to start [at which block number]? (Please note you will have a freeze period set automatically at 100000 blocks [~17 days] prior to this date and that the sale will last ~30 days)',
      validate: (value) => {
        if (!isNaN(parseInt(value, 10)) && parseInt(value, 10) > 100000) {
          return true;
        }
        return 'Please enter a numeric value bigger than 100000';
      },
    },
    {
      name: 'owner',
      type: 'input',
      message: 'What is the public address of the "owner" of the token sale? (This is the account that has powers for stopping it, etc. [please append "0x" to the address])',
      validate: (value) => {
        if (isHexAddress(value)) {
          return true;
        }
        return 'Please enter a valid address prefixed by "0x"';
      },
    },
    {
      name: 'wallet',
      type: 'input',
      message: 'What is the public address of the receiving "wallet" for the token sale? (This is the account that will receive the proceeds of the token sale [please append "0x" to the address])',
      validate: (value) => {
        if (isHexAddress(value)) {
          return true;
        }
        return 'Please enter a valid address prefixed by "0x"';
      },
    },
  ],
};
