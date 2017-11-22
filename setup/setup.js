const chalk = require('chalk');
const clear = require('clear');
const figlet = require('figlet');
const inquirer = require('inquirer');
const menu = require('inquirer-menu');
const touch = require('touch');
const fs = require('fs');
const menus = require('./menus.js');
const choices = require('./choices.js');

firstRun = false;
const overwrite = false;

clear();

console.log(chalk.yellow(figlet.textSync('Token Sale Setup')));

console.log(chalk.blue('   Your assistant to an awesome token sale (audited by ConsenSys Diligence)\n'));

(async () => {
  if (!fs.existsSync('.setup_ran')) {
    console.log(chalk.yellow('\n This seems to be the first time you are running the setup script.' +
        '\n Let\'s run the Super Easy Setup, then!\n'));

    await choices.easySetup();

    touch('.setup_ran');
  }

  await menu(menus.mainMenu);

  clear();
})();
