// https://github.com/SiriusZHT/Microservices-with-Node-JS-and-React/commit/027d191f3c24a7832af1ce129f5d8d5bdd6d5795

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(bodyParser.json());
app.use(cors());

const posts = {};

app.get('/posts', (req, res) => {
    res.send(posts);
})

// 4000 post 4001 comments
app.listen(4002, () => {
    console.log('Listening on port 4002');
})