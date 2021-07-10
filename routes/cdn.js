let Response = require('../utils/response');
const CDNHelper = require('../utils/cdnHelper');
const CDNInterface = require('../utils/cdnInterface/cdnInterface');

let express = require('express');
let router = express.Router();

router.post('/createdomain', async (req, res) => {
    let {domain} = req.body;

    let {success} = await CDNInterface.createNewDomain(domain);

    if (!success){
        res.status(500).json(
            new Response(false, {}, 
                "Can't create domain"
            ).json()
        );
        return;
    }

    res.json(
        new Response(true, {}).json()
    );
})

router.post('/getdomainstatus', async (req, res) => {
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

router.post('/checkns', async (req, res) => {
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

router.post('/removedomain', async (req, res) => {
    let {domain} = req.body;

    let {success, result} = await CDNInterface.getDomainInfo(domain);
    
    if (!success){
        res.status(500).json(
            new Response(false, {}, 
                "Can't get domain info"
            ).json()
        );
        return;
    }
    let {success2, result2} = await CDNInterface.removeDomain(domain, result.id);

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

router.post('/trafficusage', async (req, res) => {
    let {domainConfig, start, end} = req.body;

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

    sumTraffic += result.data.statistics.traffics.total;
    sumRequest += result.data.statistics.requests.total;

    reports.tempDomainStorage = result.data;

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

        reports[domain.domainName].storage = result3.data;
        
        sumTraffic += result3.data.statistics.traffics.total;
        sumRequest += result3.data.statistics.requests.total;
    }

    res.json(
        new Response(true, {
            sumTraffic, sumRequest, reports
        }).json()
    );
})

router.post('/resolvestoragedns', async (req, res) => {
    let {domainConfig} = req.body;
    console.log("resolvestoragedns", req)

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

    res.json(
        new Response(true, {
        }).json()
    );
})

module.exports = router;