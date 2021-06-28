let Response = require('../utils/response');

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

module.exports = router;