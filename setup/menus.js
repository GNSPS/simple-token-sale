const chalk = require('chalk');
const choices = require('./choices.js');


module.exports = {
  mainMenu: () => ({
    message: 'Main menu',
    choices: {
      'Super Easy Setup (Recommended)': choices.easySetup,
      'Advanced Setup': {
        message: 'Advanced Setup',
        choices: {
          'token.json': choices.token,
          'sale.json': choices.sale,
          'preBuyers.json': choices.preBuyers,
          'timelocks.json': choices.timelocks,
        },
      },
      '-------------------': () => {
        console.log(chalk.blue('This is not a valid choice! It\'s clearly just a placeholder, dude!\n Back to the menu...'));
      },
      'Token Visualizer™ - Verify your parameters!': () => {
        console.log(chalk.blue('Still uninplemented! Coming Soon™'));
      },
    },
  }),
};
