const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const crypto = require('crypto');

const app = express();
app.use(cors({
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));
app.use(bodyParser.json());
const port = 3000;

app.listen(port, () => {
    console.log(`Server started on port ${port}`);
})

const users = [];
const admins = [];

const goldsteinUser = {
    username: 'Mr. Goldstein',
    hash: 'ff5de730fa61e4b9d3ec2298efdce03e24240fb00d45f0d21f4644cda8c85ac4864091d93eefbfbb3b44b11fd6a8107d7f4675f9d4c93fc2503c27b9aa927dc8',
    salt: '19bc8c2e05f668a19bccc5262042af2b'
}
admins.push(goldsteinUser);

const generateKeys = () => {
    const keys = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048, // Recommended key size for security
        publicKeyEncoding: {
            type: 'spki', // Recommended for public keys
            format: 'pem',
        },
        privateKeyEncoding: {
            type: 'pkcs8', // Recommended for private keys
            format: 'pem',
        },
    });
    console.log('Private Key:', keys.privateKey);
    console.log('Public Key:', keys.publicKey);
    return keys;
}

const decryptData = (base64Data) => {
    // 1. Convert from encoded string to a buffer
    const buffer = Buffer.from(base64Data, 'base64');

    // 2. Explicitly define padding and hash to match the Web Crypto API
    return crypto.privateDecrypt(
        {
            key: privateKey, // Your 2048-bit key from generateKeys()
            oaepHash: "sha256", // MUST BE THIS to match client's "SHA-256"
        },
        buffer
    ).toString("utf8");
};

function createUser(user, password) {
    const salt = crypto.randomBytes(16).toString('hex');

    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
        if (err) throw err;

        const hash = derivedKey.toString('hex');

        const newUser =
        {
            username: user,
            salt: salt,
            hash: hash,
            data: ""
        };
        console.log(newUser);
        users.push(newUser);
    } )
}

function verifyPassword(inputPassword, storedSalt, storedHash, actionOnSuccess, actionOnFail) {
    crypto.scrypt(inputPassword, storedSalt, 64, (err, derivedKey) => {
        if (err) throw err;

        const inputHash = derivedKey.toString('hex');

        // Compare the newly generated hash with the one stored in the database
        if(storedHash === inputHash) {
            actionOnSuccess();
        } else
            actionOnFail();
    });
}


let {publicKey, privateKey} = generateKeys();
app.get("/public_key", (req, res) => {
    res.status(200).json(publicKey);
});

app.post('/user', (req, res) => {
    const{encryptedUserName,encryptedPassword} = req.body;
    let decryptedUserName = decryptData(encryptedUserName);
    let decryptedPassword = decryptData(encryptedPassword);
    for(let i = 0; i < users.length; i++)
    {
        if(decryptedUserName === users[i].username)
        {
            return res.status(400).send("User already exists");
        }
    }
    createUser(decryptedUserName, decryptedPassword);
    res.status(201).json();
})

app.put('/data', (req, res) => {

    //body contains username, password, and data as encrypted base64 text
    const{encryptedUserName, encryptedPassword, encryptedData} = req.body;

    //decrypt username, password, data, and query user
    let decryptedUserName = decryptData(encryptedUserName);
    let decryptedPassword = decryptData(encryptedPassword);
    let decryptedData = decryptData(encryptedData);
    const queryUser = req.query.user;

    //initialize user and boolean found
    let user;
    let userFound = false;
    let userMatchedAdmin = false;

    //find user in users and admin groups
    for(let i = 0; i < users.length; i++)
    {
        if(decryptedUserName === users[i].username)
        {
            userFound = true;
            if(queryUser === users[i].username)
            {
                user = users[i]
            }
        }
    }
    for(let i = 0; i < admins.length; i++)
    {
        if(queryUser === admins[i].username)
        {
            user = admins[i];
            userFound = true;
            userMatchedAdmin = true;
        }
    }

    if(userFound === false){
        res.status(401);
    }
    else if(userMatchedAdmin === false && userFound === false){
        res.status(404);
    }
    else
    {
        //determine access
        verifyPassword(decryptedPassword,
            user.salt,
            user.hash,
            ()=>{user.data = decryptedData;     console.log(user.data); res.status(200).send('success');},
            ()=>
            {
                res.status(403);
            });
    }
})