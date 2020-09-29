const Promise = require('bluebird');
const exec = Promise.promisify(require('child_process').exec);
let rimraf = require("rimraf");
const fs = require('fs');
const CDNHelper = require('./cdnHelper');
const CDNInterface = require('./cdnInterface/cdnInterface');
const fsPromises = fs.promises;

let HosterUtils = {};

HosterUtils.updateHosterData = () => {
    // TODO: update number of sites, usage of server (cpu, memory, space), 
    // TODO: usage of each website (cpu, memory, space)
};

HosterUtils.hostSiteZipFile = async (file, websiteName, userId, publisherId, metadata, longProcessData) => {
    try {
        let newPath = `${process.env.HOST_PATH}/${publisherId}_${userId}/${websiteName}.zip`;
        let finalPath = `${process.env.HOST_PATH}/${publisherId}_${userId}/${websiteName}`;

        // read current servicePorts.json file from `${finalPath}/servicePorts.json`
        let oldServicePorts = {};
        if (!fs.existsSync(`${finalPath}/servicePorts.json`))  {
            oldServicePorts = JSON.parse(await fsPromises.readFile(`${finalPath}/servicePorts.json`, 'utf8'));
        }
    
        updateLongProcess(longProcessData, 'Copying website files ...', "running", {
            progress: 20
        });

        let {
            success,
            error
        } = await HosterUtils.execShellCommand(
            `mv ${file.filename} ${process.env.HOST_PATH}/${publisherId}_${userId}/${websiteName}`, 
            {
                cwd: file.destination
            }
        );

        if (!success) {
            console.log("Failed on mv", error);
            throw new Error("Failed on mv ...");
        }
    
        updateLongProcess(longProcessData, 'Extracting website files ...', "running", {
            progress: 25
        });

        let unzipResult = await HosterUtils.execShellCommand(`unzip ${newPath}`);

        if (!unzipResult.success) {
            console.log("Failed on unzip", unzipResult.error);
            throw new Error("Failed on unzip ...");
        }

        await HosterUtils.removeFolder(newPath);
    
        updateLongProcess(longProcessData, 'Start services ...', "running", {
            progress: 30
        });

        // turn of all old services from oldServicePorts
        Object.values(oldServicePorts).forEach(async (port) => {
            await execShellCommand(`fuser -k ${port}/tcp`);
        });

        // start services from metadata
        let servicePorts = {};
        let services = metadata.services || [];
        
        services.forEach(async (service) => {
            let serviceResult = await HosterUtils.installService(service, `${finalPath}/services`);
            if (!serviceResult.success)
                throw new Error(`Can't install service for hoster services: ${serviceResult.message}`);

            servicePorts[service.name] = serviceResult.port;
        });

        // copy servicePorts to `${finalPath}/servicePorts.json`
        await fsPromises.writeFile(`${finalPath}/servicePorts.json`, JSON.stringify(servicePorts), 'utf8');

        return {
            success: true,
            finalPath,
            servicePorts
        }
    } catch (error) {
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
        let serverName = "";
        if (domainConfig.domainData) {
            // user has own domain
            serverName = `${domainConfig.domainData.domain}`;
        }
        else 
        {
            // user does not have a domain yet. use domainConfig.publisherWebsiteDomain
            serverName = `${username}.${domainConfig.publisherWebsiteDomain}`;
        }
    
        updateLongProcess(longProcessData, 'Configing domain ...', "running", {
            progress: 70
        });

        let root = `${process.env.HOST_PATH}/${publisherId}_${userId}`;

        let nginxTemplatePath = `${__dirname}/${process.env.BASEFILES_PATH}/nginxTemplate.conf`;
        let nginxApiTemplatePath = `${__dirname}/${process.env.BASEFILES_PATH}/nginxApiTemplate.conf`;

        let nginxTemplate = await fsPromises.readFile(nginxTemplatePath, 'utf8');
        let nginxApiTemplate = await fsPromises.readFile(nginxApiTemplatePath, 'utf8');

        let serviceRules = "";
        Object.keys(servicePorts).forEach(serviceName => {
            let conf = nginxApiTemplate;
            conf = conf.replace(/{serviceName}/g, serviceName);
            conf = conf.replace(/{servicePort}/g, servicePorts[serviceName]);
            serviceRules += `${conf} \n`;
        })

        nginxTemplate = nginxTemplate.replace(/{root}/g, root);
        nginxTemplate = nginxTemplate.replace(/{serverName}/g, serverName);
        nginxTemplate = nginxTemplate.replace(/{serviceRules}/g, serviceRules);

        let confName = `${serverName}.${websiteName}.conf`;
        let newConfPath = `${process.env.NGINX_CONFS_PATH}/sites-available/${confName}`;
        let newConfLinkPath = `${process.env.NGINX_CONFS_PATH}/sites-enabled/${confName}`;

        if (await HosterUtils.isFileChange(newConfPath, nginxTemplate)) {
            // Need to update conf and restart nginx
            await fsPromises.writeFile(newConfPath, nginxTemplate, 'utf8');

            if (!fs.existsSync(newConfLinkPath))  {
                let linkResult = await HosterUtils.execShellCommand(
                    `echo ${process.env.SUDO_PASSWORD} | sudo ln -s ${newConfPath} ${newConfLinkPath}`
                );
        
                if (!linkResult.success) {
                    console.log("Failed on linking nginx conf", linkResult.error);
                    throw new Error("Failed on linking nginx conf ...");
                }
            }

            let restartNginxResult = await HosterUtils.execShellCommand(
                `echo ${process.env.SUDO_PASSWORD} | sudo -S nginx reload`
            );
    
            if (!restartNginxResult.success) {
                console.log("Failed on restart nginx", restartNginxResult.error);
                throw new Error("Failed on restart nginx ...");
            }
        }

        return {
            success: true,
        }
    } catch (error) {
        return {
            success: false,
            error
        }
    }
};

HosterUtils.isFileChange = async (path, newData) => {
    try{
        let oldData = await fsPromises.readFile(path, 'utf8');
        return oldData === newData;
    } catch (error) {
        return false;
    }
};

HosterUtils.configCDN = async (username, websiteName, domainConfig, longProcessData) => {
    try {
        let serverName = "";
        let domain = "";
        let subDomain = username;
        let url = "";
    
        updateLongProcess(longProcessData, 'Configing CDN ...', "running", {
            progress: 55
        });

        if (domainConfig.domainData) {
            // user has own domain
            serverName = `${domainConfig.domainData.domain}`;
            domain = serverName;
            url = domain;

            if (!await CDNHelper.cdnRecordExist(domain, '@')) {
                let createRecordResult = await CDNInterface.createDNSRecord(domain, {
                    type: 'a',
                    name: '@',
                    value: process.env.IP,
                    cloud: true,
                    upstream_https: "http",
                })

                if (!createRecordResult.success)
                    throw new Error('Failed on create new dns record ...');
            }

            let checkNSResult = await CDNInterface.checkDomainNS(domain);

            if (checkNSResult.success) {
                // remove old address
                let dnsRecord = await CDNHelper.cdnRecordExist(domainConfig.publisherWebsiteDomain, subDomain);
                if (dnsRecord) {
                    await CDNInterface.removeDNSRecord(domain, dnsRecord.id);
                }
            }

            let httpsResult = await CDNHelper.updateOrCreateHttps(domain);

            if (!httpsResult.success)
                throw new Error("Failed on updateOrCreateHttps ...");
        }
        else 
        {
            // user does not have a domain yet. use domainConfig.publisherWebsiteDomain
            serverName = `${username}.${domainConfig.publisherWebsiteDomain}`;
            domain = domainConfig.publisherWebsiteDomain;
            url = `${serverName}/${websiteName}`;

            if (!await CDNHelper.cdnRecordExist(domain, subDomain)) {
                let createRecordResult = await CDNInterface.createDNSRecord(domain, {
                    type: 'a',
                    name: subDomain,
                    value: process.env.IP,
                    cloud: true,
                    upstream_https: "http",
                })

                if (!createRecordResult.success)
                    throw new Error('Failed on create new dns record ...');

                // TODO host in public subdomain like websites.hoster.com
                // TODO beacause creating new record may will be ready some hour later
            }
        }

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