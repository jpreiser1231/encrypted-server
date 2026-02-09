const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors({
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));
app.use(bodyParser.json());
const port = 3000;

app.listen(port, () => {
    console.log(`Server started on port ${port}`);
})
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

let {publicKey, privateKey} = generateKeys();
app.get("/", (req, res) => {
    res.status(200).json(publicKey);
});