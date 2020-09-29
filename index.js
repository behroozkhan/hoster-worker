require('dotenv').config();

const express = require('express');
const bodyParser= require('body-parser');
const multer = require('multer');
const app = express();
let cors = require('cors');
const HosterUtils = require('./utils/HosterUtils');
const Response = require('./utils/response')
let {
    updateLongProcess,
} = require('./utils/utils');

app.use(bodyParser.urlencoded({extended: true}));
app.use(cors());
app.options('*', cors());

let storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'uploads')
    },
    filename: function (req, file, cb) {
      cb(null, file.fieldname + '-' + Date.now())
    }
})
   
let upload = multer({ storage: storage })

app.post('/host', upload.single('siteZip'), async (req, res) => {
    // host a website and start its services
    const file = req.file;

    if (!file) {
        res.status(404).json(
            new Response(false, {}, 
                "File not found"
            ).json()
        );
        return;
    }

    console.log("req.body", req.body);

    const {username, websiteName, userId, publisherId, domainConfig, metadata, longProcessData} = req.body;

    res.json(
        new Response(true, {
            longProcessId: longProcessData.longProcessId
        }).json()
    );
    
    updateLongProcess(longProcessData, 'Files recieved by host ...', "running", {
        progress: 20
    });

    let hostResult = await HosterUtils.hostSiteZipFile(file, websiteName, userId, publisherId, 
        metadata, longProcessData);

    if (!hostResult.success) {
        res.status(500).json(
            new Response(false, {error: hostResult.error}, 
                error.message
            ).json()
        );
        return;
    }
    
    updateLongProcess(longProcessData, 'Services started ...', "running", {
        progress: 70
    });
    
    let nginxResult = await HosterUtils.configNginx(username, websiteName, publisherId, userId, 
        hostResult.finalPath, domainConfig, hostResult.servicePorts, longProcessData);

    if (!nginxResult.success) {
        res.status(500).json(
            new Response(false, {error: hostResult.error}, 
                error.message
            ).json()
        );
        return;
    }
    
    updateLongProcess(longProcessData, 'Domain configed ...', "running", {
        progress: 80
    });
    
    let cdnResult = await HosterUtils.configCDN(username, websiteName, domainConfig, longProcessData);

    if (!cdnResult.success) {
        res.status(500).json(
            new Response(false, {error: hostResult.error}, 
                error.message
            ).json()
        );
        return;
    }
    
    updateLongProcess(longProcessData, 'Website hosted successfully ...', "running", {
        progress: 100,
        finalPath: hostResult.finalPath,
        url: cdnResult.url
    });
})

app.post('/stop', async function (req, res) {
    // TODO stop a website
});

app.post('/remove', async function (req, res) {
    // TODO remove a website
});

app.post('/update', async function (req, res) {
    // TODO update exist website files
});

app.post('/config', async function (req, res) {
    // TODO set some config for website
});

app.post('/setdomain', async function (req, res) {
    // TODO set domain or subdomain for exist website
});

app.post('/removedomain', async function (req, res) {
    // TODO set domain or subdomain for exist website
});

app.get('/test', async function (req, res) {
    res.json(
        new Response(true, {message: "Hoster is alive ..."}).json()
    )
});
 
app.listen(process.env.PORT, () => {
    console.log(`publisher worker listening on port ${process.env.PORT}!`);
});