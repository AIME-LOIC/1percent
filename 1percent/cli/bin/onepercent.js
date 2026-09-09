#!/usr/bin/env node

/* ============================================================
   1% Learn CLI — Entry Point
   ============================================================
   Usage:
     onepercent login              — Authenticate with 1% Learn
     onepercent upload <file>      — Upload a file to your lab
     onepercent pull <filename>    — Pull a file from your lab
     onepercent ls                 — List all your files
     onepercent rm <filename>      — Delete a file
     onepercent premium            — Check your premium status
     onepercent download -f <course> -l <lesson>  — Download lessons
     onepercent project new <name> — Create a project folder
     onepercent project ls         — List project folders
     onepercent whoami             — Show current user info
   ============================================================ */

const { Command } = require('commander');
const pkg = require('../package.json');

const program = new Command();

program
  .name('onepercent')
  .description('1% Learn CLI — Upload, download, and manage your learning files')
  .version(pkg.version);

// Load commands
require('../commands/login').register(program);
require('../commands/upload').register(program);
require('../commands/pull').register(program);
require('../commands/ls').register(program);
require('../commands/rm').register(program);
require('../commands/premium').register(program);
require('../commands/download').register(program);
require('../commands/project').register(program);
require('../commands/whoami').register(program);

program.parse();
