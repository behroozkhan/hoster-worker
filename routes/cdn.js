let Response = require('../utils/response');
const CDNHelper = require('../utils/cdnHelper');
const CDNInterface = require('../utils/cdnInterface/cdnInterface');

let express = require('express');
let router = express.Router();
const bodyParser= require('body-parser');
let jsonParser = bodyParser.json()

router.post('/createdomain', jsonParser, async (req, res) => {
    let {domain} = req.body;

    let {success, result} = await CDNInterface.createNewDomain(domain);

    if (!success){
        res.json(
            new Response(false, result, 
                "Can't create domain"
            ).json()
        );
        return;
    }

    res.json(
        new Response(true, result).json()
    );
})

router.post('/cdnrecordexist', jsonParser, async (req, res) => {
    let {domain, subdomain} = req.body;

    try{
        let exist = await CDNHelper.cdnRecordExist(domain, subdomain);

        res.json(
            new Response(true, {exist}).json()
        );
    } catch (error) {
        console.log("dnsrecordexist", error);
        res.status(500).json(
            new Response(false, {error}, "Server error").json()
        );
        return;
    }
})

router.post('/getdomainstatus', jsonParser, async (req, res) => {
    let {domain} = req.body;

    let {success, result} = await CDNInterface.getDomainInfo(domain);

    if (!success){
        res.status(500).json(
            new Response(false, {}, 
                "Can't create domain"
            ).json()
        );
        return;
    }


    res.json(
        new Response(true, result).json()
    );
})

router.post('/checkns', jsonParser, async (req, res) => {
    let {domain} = req.body;

    let {success, result} = await CDNInterface.checkDomainNS(domain);

    if (!success){
        res.status(500).json(
            new Response(false, {}, 
                "Can't create domain"
            ).json()
        );
        return;
    }

    res.json(
        new Response(true, result).json()
    );
})

router.post('/removedomain', jsonParser, async (req, res) => {
    let {domain} = req.body;

    let {success, result} = await CDNInterface.getDomainInfo(domain);
    
    if (!success){
        res.json(
            new Response(true, {}).json()
        );
        return;
    }
    let {success: success2, result: result2} = await CDNInterface.removeDomain(domain, result.id);

    if (!success2){
        res.status(500).json(
            new Response(false, {}, 
                "Can't remove domain"
            ).json()
        );
        return;
    }

    res.json(
        new Response(true, {}).json()
    );
})

router.post('/domaininit', jsonParser, async (req, res) => {
    let {domain} = req.body;

    let {success} = await CDNInterface.redirectWWW(domain);

    if (!success){
        res.status(500).json(
            new Response(false, {}, 
                "Can't redirectWWW for domain"
            ).json()
        );
        return;
    }

    let {success: success2} = await CDNHelper.updateOrCreateHttps(domain);

    if (!success2) {
        res.status(500).json(
            new Response(false, {}, 
                "Can't updateOrCreateHttps for domain"
            ).json()
        );
        return;
    }

    res.json(
        new Response(true, {}).json()
    );
})

router.post('/checkdomain', jsonParser, async (req, res) => {
    let {domain} = req.body;

    let {success} = await CDNInterface.redirectWWW(domain);

    if (!success){
        res.status(500).json(
            new Response(false, {}, 
                "Can't redirectWWW for domain"
            ).json()
        );
        return;
    }

    let {success: success2, result: {httpsReady, needInit}} = await CDNHelper.httpsReady(domain);

    if (!success2) {
        res.status(500).json(
            new Response(false, {}, 
                "Can't updateOrCreateHttps for domain"
            ).json()
        );
        return;
    }

    res.json(
        new Response(true, {httpsReady, needInit}).json()
    );
})

router.post('/trafficusage', jsonParser, async (req, res) => {
    let {domainConfig, start, end} = req.body;
    console.log("trafficusage")

    let sumTraffic = 0;
    let sumRequest = 0;

    let reports = {};

    let tempDomainName = domainConfig.tempDomain.publisherTempDomain;
    let tempSubDomain = domainConfig.tempDomain.storageSubDomain;
    
    let {success, result} = 
        await CDNHelper.getDomainUsage(tempDomainName, tempSubDomain, start, end);
    if (!success){
        res.status(500).json(
            new Response(false, {}, 
                "Can't get domain usage temp subdomain"
            ).json()
        );
        return;
    }

    // TODO due to arvan bug, must remove it. back it when bug resolved
    // sumTraffic += result.data.statistics.traffics.total;
    // sumRequest += result.data.statistics.requests.total;

    // reports.tempDomainStorage = result.data;

    for (let i = 0; i < domainConfig.domainData.length; i++) {
        let domain = domainConfig.domainData[i];
        let {success: success2, result: result2} = 
            await CDNHelper.getDomainUsage(domain.domainName, "@", start, end);
        if (!success2){
            res.status(500).json(
                new Response(false, {}, 
                    "Can't get domain usage"
                ).json()
            );
            return;
        }

        reports[domain.domainName] = {
            root: result2.data
        }

        sumTraffic += result2.data.statistics.traffics.total;
        sumRequest += result2.data.statistics.requests.total;
        
        let {success: success3, result: result3} = 
            await CDNHelper.getDomainUsage(domain.domainName, domain.storageSubDomain, start, end);
        if (!success3){
            res.status(500).json(
                new Response(false, {}, 
                    "Can't get domain usage with subdomain"
                ).json()
            );
            return;
        }

        // reports[domain.domainName].storage = result3.data;
        
        // TODO due to arvan bug, must remove it. back it when bug resolved
        // sumTraffic += result3.data.statistics.traffics.total;
        // sumRequest += result3.data.statistics.requests.total;
    }

    res.json(
        new Response(true, {
            sumTraffic, sumRequest, reports
        }).json()
    );
})

router.post('/resolvestoragedns', jsonParser, async (req, res) => {
    let {domainConfig} = req.body;
    console.log("resolvestoragedns", req.body)

    let storageSubDomain = domainConfig.tempDomain.storageSubDomain;
    let domain = domainConfig.tempDomain.publisherTempDomain;
    if (!await CDNHelper.cdnRecordExist(domain, storageSubDomain)) {
        let createStorageRecordResult = await CDNInterface.createDNSRecord(domain, {
            type: 'cname',
            name: storageSubDomain,
            value: {
                host: "weblancerstorage.s3.ir-thr-at1.arvanstorage.com", // TODO make it dynamic
                host_header: "dest"
            },
            cloud: true
        });

        if (!createStorageRecordResult.success) {
            console.log("createStorageRecord error", createStorageRecordResult.error);
            throw new Error('Failed on create new storage dns record ...');
        }
    }

    console.log("resolvestoragedns response send")

    res.json(
        new Response(true, {
        }).json()
    );
})

module.exports = router;