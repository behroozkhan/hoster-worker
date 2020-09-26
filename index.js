require('dotenv').config();

let express = require('express');
let app = express();
let cors = require('cors');
app.use(cors());
app.options('*', cors());
app.use(express.json());

app.post('/host', function (req, res) {
    // TODO host website and start its services
    // TODO host a service
    // Call all of them website
})

app.post('/stop', function (req, res) {
    // TODO stop a website
})

app.post('/remove', function (req, res) {
    // TODO remove a website
})

app.post('/update', function (req, res) {
    // TODO update exist website files
})

app.post('/config', function (req, res) {
    // TODO set some config for website
})

app.post('/setdomain', function (req, res) {
    // TODO set domain or subdomain for exist website
})

app.post('/removedomain', function (req, res) {
    // TODO remove domain or subdomain for exist website
})
 
app.listen(process.env.PORT, () => {
    console.log(`publisher worker listening on port ${process.env.PORT}!`);
});