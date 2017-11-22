const chalk = require('chalk');
const inquirer = require('inquirer');
const fs = require('fs');
const inquiries = require('./inquiries.js');

module.exports = {
  token: async () => {
    console.log(chalk.blue('\n\n[+] Modifying "token.json"\n'));

    if (fs.existsSync('conf/token.json')) {
      console.log(chalk.yellow('\nThe file with your token parameters already exists.'));
      if (!(await inquiries.confirmOverwrite())) { return; }
    }

    const token = await inquirer.prompt(inquiries.tokenInquiries);

    token.initialAmount *= 10 ** token.decimalUnits;

    fs.writeFile('conf/token.json', JSON.stringify(token, null, 2), 'utf8', (err) => {
      if (err) { throw new Error(err); }
    });
  },

  sale: async () => {
    console.log(chalk.blue('\n\n[+] Modifying "sale.json"\n'));

    if (fs.existsSync('conf/sale.json')) {
      console.log(chalk.yellow('\nThe file with your sale parameters already exists.'));
      if (!(await inquiries.confirmOverwrite())) { return; }
    }

    const sale = await inquirer.prompt(inquiries.saleInquiries);

    fs.writeFile('conf/sale.json', JSON.stringify(sale, null, 2), 'utf8', (err) => {
      if (err) { throw new Error(err); }
    });
  },

  preBuyers: async () => {
    console.log(chalk.blue('\n\n[+] Modifying "preBuyers.json"\n'));

    if (fs.existsSync('conf/preBuyers.json')) {
      console.log(chalk.yellow('\nThe file with your pre-buyers already exists.'));
      if (!(await inquiries.confirmOverwrite())) { return; }
    }

    if (fs.existsSync('conf/token.json')) {
      console.log(chalk.yellow('\nNo "token.json" file was found. Please create that first.'));
      return;
    }

    const tokenConf = JSON.parse(fs.readFileSync('./conf/token.json'));

    if (!tokenConf.hasOwnProperty(decimalUnits)) {
      console.log(chalk.yellow('\nBadly configured "token.json". Please run the configuration tool for that file first.'));
      return;
    }

    const preBuyersArr = [];

    console.log(chalk.yellow('\n\nYou will now have the opportunity to add multiple pre-buyers.' +
        '\nThese are the people (represented by addresses) that have already ' +
        'contributed earlier (have given you the money :D) to get into the sale.' +
        '\n\nThis is basically acting as a whitelist. So be careful, please, since ' +
        'whoever you specify here will get tokens "for free", basically.' +
        '\n\nPlease remember not to repeat addresses since if you do, deployment ' +
        'will fail. So no duplicate addresses, please! :)' +
        '\n\nLet\'s start adding them, then:'));

    do {
      preBuyersArr.push(await inquirer.prompt(inquiries.preBuyersInquiries));
    }
    while (await confirmContinuing('pre-buyer'));

    const preBuyers = preBuyersArr.reduce(
      (acc, cur, i) => {
        acc[i] = cur;
        return acc;
      },
      {},
    );

    fs.writeFile('conf/preBuyers.json', JSON.stringify(preBuyers, null, 2), 'utf8', (err) => {
      if (err) { throw new Error(err); }
    });
  },

  timelocks: async () => {
    console.log(chalk.blue('\n\n[+] Modifying "timelocks.json"\n'));

    if (fs.existsSync('conf/timelocks.json')) {
      console.log(chalk.yellow('\nThe file with your timelocks already exists.'));
      if (!(await inquiries.confirmOverwrite())) { return; }
    }

    const timelocksArr = [];

    console.log(chalk.yellow('\n\nYou will now have the opportunity to add multiple timelocks for ' +
        'releasing tokens to the founders (or someone else).' +
        '\nThese are the people (represented by addresses) that will receive tokens ' +
        '(vested or not).' +
        '\n\nThe vesting schedule will be achieved by specifying tranches. You can ' +
        'specify an arbitrary number of these realeasing as much as you want each time.' +
        '\n\nAlso do remember that the way this token sale is structured you\'ll have ' +
        'half the tokens to distribute. So don\'t forget any! :D' +
        '\n\nLet\'s add the timelocks:'));

    let counter = 0;
    do {
      timelocksArr.push(await inquirer.prompt(inquiries.timelocksInquiries));

      const tranchesArr = [];

      console.log(chalk.yellow('\nNow we\'ll add the tranches for this timelock:'));
      do {
        tranchesArr.push(await inquirer.prompt(inquiries.tranchesInquiries));
      }
      while (await inquiries.confirmContinuing('tranche'));

      const tranches = tranchesArr.reduce(
        (acc, cur, i) => {
          acc[i] = cur;
          return acc;
        },
        {},
      );

      timelocksArr[counter++].tranches = tranches;
    }
    while (await confirmContinuing('timelock'));

    const timelocks = timelocksArr.reduce(
      (acc, cur, i) => {
        acc[i] = cur;
        return acc;
      },
      {},
    );

    fs.writeFile('conf/timelocks.json', JSON.stringify(timelocks, null, 2), 'utf8', (err) => {
      if (err) { throw new Error(err); }
    });
  },

  easySetup: async () => {
    console.log(chalk.yellow('\nThis Super Easy Setup will create new config files.\n(If you have already populated those please leave now [ctrl + C] and create a file named ".setup_ran" inside the project root folder.)\n'));

    const answers = await inquirer.prompt(inquiries.easySetupInquiries);

    let token = {};

    token.tokenName = answers.tokenName;
    token.tokenSymbol = answers.tokenSymbol;
    token.initialAmount = answers.initialAmount * 10 ** 18;
    token.decimalUnits = 18;

    fs.writeFile('conf/token.json', JSON.stringify(token, null, 2), 'utf8', (err) => {
      if (err) { throw new Error(err); }
    });

    let sale = {};

    sale.owner = answers.owner;
    sale.wallet = answers.wallet;
    sale.price = answers.raisedEth / answers.initialAmount;
    sale.startBlock = answers.startBlock;
    sale.freezeBlock = answers.startBlock - 100000;
    sale.endBlock = answers.startBlock + 180000;

    fs.writeFile('conf/sale.json', JSON.stringify(sale, null, 2), 'utf8', (err) => {
      if (err) { throw new Error(err); }
    });

    console.log(chalk.yellow('\nSetup concluded successfuly!\n'));
  },
};
