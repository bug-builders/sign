const crypto = require('crypto');
const forge = require('node-forge');
const fs = require('fs');
const cp = require('child_process');
const fetch = require('node-fetch');
const inquirer = require('inquirer');

function asciiToHexString(str) {
  return str
    .split('')
    .map(c => `0${c.charCodeAt(0).toString(16)}`.slice(-2))
    .join('');
}

function hexStringToAscii(hexx) {
  const hex = hexx.toString();
  let str = '';
  for (let i = 0; i < hex.length; i += 2) {
    str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
  }
  return str;
}

function sign(datas, key) {
  const pss = forge.pss.create({
    md: forge.md.sha256.create(),
    mgf: forge.mgf.mgf1.create(forge.md.sha256.create()),
    saltLength: 32,
  });

  const md = forge.md.sha256.create();
  md.update(datas, 'utf8');

  const signature = key.sign(md, pss);

  return asciiToHexString(signature);
}

const filename = process.argv[2];
function work(cert) {
  const pkeyFile = process.argv[3] ? process.argv[3] : `${process.env['HOME']}/.ssh/${cert}`;

  const pkey = fs.readFileSync(pkeyFile, 'utf8');
  const privateKey = forge.pki.privateKeyFromPem(pkey);
  // const privateKey = forge.pki.decryptRsaPrivateKey(pem, 'password');

  const sha = cp.execFileSync('git', ['hash-object', filename]).toString().trim();

  console.log(sign(sha, privateKey));
}

if (process.argv[3]) work();
else {
  const certs = fs.readdirSync(`${process.env['HOME']}/.ssh/`)
    .filter(f => f.includes('.pub'))
    .map(f => f.replace('.pub', ''));

  if (certs.length > 1)
    inquirer.prompt({
      type: 'list',
      name: 'cert',
      message: 'Which certificate do you wish to use ?',
      choices: certs,
    }).then(answer => {
      return work(answer.cert);
    });
  else work(certs[0]);
}

