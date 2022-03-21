// https://github.com/SiriusZHT/Microservices-with-Node-JS-and-React/commit/027d191f3c24a7832af1ce129f5d8d5bdd6d5795

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());
app.use(cors());

app.listen(4005, () => {
    console.log('listening on port 4005');
}) 