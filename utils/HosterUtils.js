const Promise = require('bluebird');
const exec = Promise.promisify(require('child_process').exec);
let rimraf = require("rimraf");
const fs = require('fs');
const CDNHelper = require('./cdnHelper');
const CDNInterface = require('./cdnInterface/cdnInterface');
const { updateLongProcess } = require('./utils');
const fsPromises = fs.promises;
var path = require('path');

let HosterUtils = {};

HosterUtils.updateHosterData = () => {
    // TODO: update number of sites, usage of server (cpu, memory, space), 
    // TODO: usage of each website (cpu, memory, space)
};

HosterUtils.hostSiteZipFile = async (file, websiteName, userId, publisherId, metadata, longProcessData) => {
    try {
        websiteName = websiteName.toLowerCase();
        console.log("Copying files 1 ...");
        let newPath = `${process.env.HOST_PATH}/${publisherId}_${userId}/${websiteName}.zip`;
        let finalPath = `${process.env.HOST_PATH}/${publisherId}_${userId}/${websiteName}`;

        // read current servicePorts.json file from `${finalPath}/servicePorts.json`
        let oldServicePorts = {};
        console.log("Copying files 2 ...");
        if (fs.existsSync(`${finalPath}/servicePorts.json`))  {
            console.log("Copying files 3 ...");
            let oldServicePortData = await fsPromises.readFile(`${finalPath}/servicePorts.json`, 'utf8')
            oldServicePorts = JSON.parse(oldServicePortData);
        }
    
        console.log("Copying files 4 ...");
        updateLongProcess(longProcessData, 'Copying website files ...', "running", {
            progress: 20
        });
        
        // TODO make it async in safe way
        if (!fs.existsSync(`${process.env.HOST_PATH}/${publisherId}_${userId}/${websiteName}`)) 
        {
            console.log("Copying files 5 ...");
            fs.mkdirSync(`${process.env.HOST_PATH}/${publisherId}_${userId}/${websiteName}`, {recursive: true});
        }

        console.log("Copying files 6 ...");
        let {
            success,
            error
        } = await HosterUtils.execShellCommand(
            `mv ${file.filename} ${process.env.HOST_PATH}/${publisherId}_${userId}/${websiteName}/${websiteName}.zip`, 
            {
                cwd: file.destination
            }
        );

        console.log("Copying files 7 ...");
        if (!success) {
            console.log("Failed on mv", error);
            throw new Error("Failed on mv ...");
        }
    
        updateLongProcess(longProcessData, 'Extracting website files ...', "running", {
            progress: 25
        });

        console.log("Copying files 8 ...");
        let unzipResult = await HosterUtils.execShellCommand(`echo A | unzip ${websiteName}.zip`, {
            cwd: finalPath
        });

        console.log("Copying files 9 ...");
        if (!unzipResult.success) {
            console.log("Failed on unzip", unzipResult.error);
            throw new Error("Failed on unzip ...");
        }

        await HosterUtils.removeFolder(newPath);
    
        console.log("Copying files 10 ...");
        updateLongProcess(longProcessData, 'Start services ...', "running", {
            progress: 30
        });

        // turn of all old services from oldServicePorts
        Object.values(oldServicePorts).forEach(async (port) => {
            await execShellCommand(`fuser -k ${port}/tcp`);
        });
        console.log("Copying files 11 ...");

        // start services from metadata
        let servicePorts = {};
        let services = metadata.services || [];
        
        console.log("Copying files 12 ...");
        services.forEach(async (service) => {
            let serviceResult = await HosterUtils.installService(service, `${finalPath}/services`);
            if (!serviceResult.success)
                throw new Error(`Can't install service for hoster services: ${serviceResult.message}`);

            servicePorts[service.name] = serviceResult.port;
        });

        console.log("Copying files 13 ...");
        // copy servicePorts to `${finalPath}/servicePorts.json`
        await fsPromises.writeFile(`${finalPath}/servicePorts.json`, JSON.stringify(servicePorts), 'utf8');

        // set data in a json file in public folder, that provide production view for editor
        await fsPromises.writeFile(`${finalPath}/static/json/env.json`, JSON.stringify({
            value: "production"
        }), 'utf8');
        // set siteData in a json in public folder
        await fsPromises.writeFile(`${finalPath}/static/json/siteData.json`, 
            JSON.stringify(metadata.siteData), 'utf8');

        console.log("Copying files complete");
        return {
            success: true,
            finalPath,
            servicePorts
        }
    } catch (error) {
        console.log("hostSiteZipFile error", error);
        return {
            success: false,
            error
        }
    }
};

HosterUtils.installService = async (service, path) => {
    try {
        // TODO copy or install service files to project directory

        return {
            success: true
        };
    } catch (error) {
        return {
            success: false,
            error,
            message: error.message
        };
    }
}

HosterUtils.configNginx = async (username, websiteName, publisherId, userId, finalPath, 
    domainConfig, servicePorts, longProcessData) => 
{
    try {
        console.log("Configing nginx 1 ...");
        
        let todo = async (serverName, isDomain) => {
            let root = `${process.env.HOST_PATH}/${publisherId}_${userId}`;
        
            console.log("Configing nginx 2 ...");
            let nginxTemplatePath = path.join(__dirname, '..', 'baseFiles', 
                !isDomain? 'nginxTemplateTemp.conf': 'nginxTemplate.conf');
            let nginxApiTemplatePath = path.join(__dirname, '..', 'baseFiles', 'nginxApiTemplate.conf');
    
            let nginxTemplate = await fsPromises.readFile(nginxTemplatePath, 'utf8');
            let nginxApiTemplate = await fsPromises.readFile(nginxApiTemplatePath, 'utf8');
    
            console.log("Configing nginx 3 ...");
            let serviceRules = "";
            Object.keys(servicePorts).forEach(serviceName => {
                let conf = nginxApiTemplate;
                conf = conf.replace(/{serviceName}/g, serviceName);
                conf = conf.replace(/{servicePort}/g, servicePorts[serviceName]);
                serviceRules += `${conf} \n`;
            })
    
            console.log("Configing nginx 4 ...");
            nginxTemplate = nginxTemplate.replace(/{root}/g, root);
            nginxTemplate = nginxTemplate.replace(/{websiteName}/g, websiteName.toLowerCase());
            nginxTemplate = nginxTemplate.replace(/{serverName}/g, serverName);
            nginxTemplate = nginxTemplate.replace(/{serviceRules}/g, serviceRules);
    
            console.log("Configing nginx 5 ...");
            let confName = `${serverName}.conf`;
            let newConfPath = `${process.env.NGINX_CONFS_PATH}/sites-available/${confName}`;
            let newConfLinkPath = `${process.env.NGINX_CONFS_PATH}/sites-enabled/${confName}`;
    
            if (await HosterUtils.isFileChange(newConfPath, nginxTemplate)) {
                // Need to update conf and restart nginx
                console.log("Configing nginx 6 ...");
                
                // await fsPromises.writeFile(newConfPath, nginxTemplate, 'utf8');
    
                let confResult = await HosterUtils.execShellCommand(
                    `echo "${nginxTemplate}" | sudo tee ${newConfPath}`
                );
        
                if (!confResult.success) {
                    console.log("Failed on create nginx conf", confResult.error);
                    throw new Error("Failed on create nginx conf ...");
                }
    
                if (!fs.existsSync(newConfLinkPath))  {
                    let linkResult = await HosterUtils.execShellCommand(
                        `echo ${process.env.SUDO_PASSWORD} | sudo ln -s ${newConfPath} ${newConfLinkPath}`
                    );
            
                    if (!linkResult.success) {
                        console.log("Failed on linking nginx conf", linkResult.error);
                        throw new Error("Failed on linking nginx conf ...");
                    }
                }
    
                console.log("Configing nginx 7 ...");
                let restartNginxResult = await HosterUtils.execShellCommand(
                    `echo ${process.env.SUDO_PASSWORD} | sudo -S systemctl reload nginx`
                );
        
                if (!restartNginxResult.success) {
                    console.log("Failed on restart nginx", restartNginxResult.error);
                    throw new Error("Failed on restart nginx ...");
                }
            }
    
        }
    
        let serverName = "";
        // user does not have a domain yet. use domainConfig.publisherWebsiteDomain
        // serverName = `${username}.${domainConfig.publisherWebsiteDomain}`;
        let url = new URL(domainConfig.tempDomain.targetUrl);
        serverName = url.hostname;
    
        updateLongProcess(longProcessData, 'Configing domain ...', "running", {
            progress: 70
        });

        await todo(serverName);

        if ((domainConfig.domainData || []).length > 0) {
            // user has own domain
            domainConfig.domainData.forEach(async (d) => {
                serverName = d.domainName;
                await todo(serverName, true);
            });
        }
        
        console.log("Configing nginx complete");
        return {
            success: true,
        }
    } catch (error) {
        console.log("configNginx error", error);
        return {
            success: false,
            error
        }
    }
};

HosterUtils.isFileChange = async (path, newData) => {
    console.log("isFileChange", path, newData)
    try{
        console.log("isFileChange 1")
        let oldData = await fsPromises.readFile(path, 'utf8');
        console.log("isFileChange 2", oldData === newData)
        return oldData !== newData;
    } catch (error) {
        console.log("isFileChange 3 error", error)
        return true;
    }
};

HosterUtils.configCDN = async (username, websiteName, websiteId, 
    userId, publisherId, domainConfig, longProcessData) => 
{
    try {
        console.log("Configing CDN 1 ...");
        let serverName = "";
        let domain = "";
        let subDomain = username;
        let url = "";
    
        updateLongProcess(longProcessData, 'Configing CDN ...', "running", {
            progress: 55
        });

        console.log("domainConfig.domainData", domainConfig.domainData)
        let activeDomains = (domainConfig.domainData || []).filter(d => {
            return d.active;
        })

        if (activeDomains.length > 0) {
            // user has own domain
            for (let i = 0 ; i < activeDomains.length; i++) {
                let domain = activeDomains[i].domainName;

                url = domain;

                console.log("domainExist", domain)
                if (!await CDNHelper.domainExist(domain)) {
                    throw new Error('Domain is not exist ...');
                }

                // remove old address based on publiher subdomain address
                // let dnsRecord = await CDNHelper.cdnRecordExist(domainConfig.publisherWebsiteDomain, subDomain);
                // if (dnsRecord) {
                //     await CDNInterface.removeDNSRecord(domain, dnsRecord.id);
                // }

                let httpsResult = await CDNHelper.updateOrCreateHttps(domain);

                if (!httpsResult.success) {
                    console.log("https error", httpsResult.error);
                    throw new Error("Failed on updateOrCreateHttps ...");
                }
                
                // TODO add @ dns record
                if (!await CDNHelper.cdnRecordExist(domain, "")) {
                    let createRecordResult = await CDNInterface.createDNSRecord(domain, {
                        type: 'a',
                        name: "@",
                        value: [{
                            ip: process.env.IP
                        }],
                        cloud: true
                    })
                    console.log("Configing CDN 111 ...");
    
                    if (!createRecordResult.success) {
                        console.log("createRecord error", createRecordResult.error);
                        // throw new Error('Failed on create new dns record ...');
                    }
                }

                // TODO add object storage Cname
                let storageSubDomain = `storage`;
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
            }
        }
        else 
        {
            console.log("Configing CDN 2 ...");
            // user does not have a domain yet. use domainConfig.publisherWebsiteDomain
            // serverName = `${username}.${domainConfig.publisherWebsiteDomain}`;
            // domain = domainConfig.publisherWebsiteDomain;
            domain = domainConfig.tempDomain.publisherTempDomain;
            // url = `${serverName}/${websiteName}`;
            url = domainConfig.tempDomain.targetUrl;

            if (!await CDNHelper.cdnRecordExist(domain, subDomain)) {
                let createRecordResult = await CDNInterface.createDNSRecord(domain, {
                    type: 'a',
                    name: subDomain,
                    value: [{
                        ip: process.env.IP
                    }],
                    cloud: true,
                    upstream_https: "http",
                })
                console.log("Configing CDN 3 ...");

                if (!createRecordResult.success) {
                    console.log("createRecord error", createRecordResult.error);
                    throw new Error('Failed on create new dns record ...');
                }
            }
            
            let storageSubDomain = `${websiteName}storage${username}`;
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
        }

        console.log("Configing CDN complete");
        return {
            success: true,
            url
        }
    } catch (error) {
        console.log("configCDN error", error);
        return {
            success: false,
            error
        }
    }
};

HosterUtils.removeFolder = (path) => {
    return new Promise(function (resolve, reject) {
        rimraf(path, function () { 
            resolve();
        });
    })
    
}

HosterUtils.execShellCommand = function execShellCommand(cmd, config) {
    return new Promise((resolve, reject) => {
        exec(cmd, config, (error, stdout, stderr) => {
            let success = !(error);
            resolve({
                success,
                stdout,
                stderr,
                error
            });
        });
    });
}

module.exports = HosterUtils;