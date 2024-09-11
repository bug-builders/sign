const crypto = require('crypto');
const fs = require('fs');
const cp = require('child_process');
const inquirer = require('inquirer');


function sign(datas, key) {
  const sign = crypto.createSign('SHA256')
  sign.update(datas, 'utf-8')

  const signature = sign.sign({
    key: key,
    padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
    saltLength: 32
  });

  return signature.toString('hex')
}

const passphrase = process.env.SSH_PASSPHRASE

const filename = process.argv[2];
function work(cert) {
  const pkeyFile = process.argv[3] ? process.argv[3] : `${process.env['HOME']}/.ssh/${cert}`;

  const pkey = fs.readFileSync(pkeyFile, 'utf8');
  const privateKey = crypto.createPrivateKey({key: pkey, format:'pem', ...(passphrase ? {passphrase}:{})});

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

