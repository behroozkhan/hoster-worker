const CDNInterface = require('./cdnInterface/cdnInterface');

let CDNHelper = {};

CDNHelper.cdnRecordExist = async (domain, exactSearch) => {
    try{
        let {success, result} = await CDNInterface.dnsRecordList(domain, {search: exactSearch});
        
        if (!success) {
            throw new Error("dnsRecordList error ...");
        }

        let foundRecord = result.data.find(rec => {
            return rec.name === exactSearch;
        });

        return foundRecord;
    } catch (error) {
        console.log("cdnRecordExist error", error);
        return false;
    }
};

CDNHelper.domainExist = async (domain) => {
    try{
        let {success, result} = await CDNInterface.getDomainInfo(domain);
        
        if (!success) {
            throw new Error("dnsRecordList error ...");
        }

        return result.id;
    } catch (error) {
        console.log("cdnRecordExist error", error);
        return false;
    }
};

CDNHelper.updateOrCreateHttps = async (domain) => {
    try{
        let {success, result} = await CDNInterface.getHttpsSetting(domain);

        if (!success)
            throw new Error('Failed on get https setting');
        
            console.log("updateOrCreateHttps", result)
        if (!result.data.f_ssl_status) {
            let updateStatusResult = await CDNInterface.updateHttpsStatus(domain, "on");

            if (!updateStatusResult.success)
                throw new Error('Failed on update https status');
        }

        let updateResult = await CDNInterface.updateHttpsSetting(domain, {
            f_ssl_type: 'arvan',
            f_ssl_subdomain: true,
            f_ssl_redirect: true
        });
        
        if (!updateResult.success)
            throw new Error('Failed on update https setting');

        return {
            success: true
        };
    } catch (error) {
        return {
            success: false,
            error
        };
    }
};

CDNHelper.httpsReady = async (domain) => {
    try{
        let {success, result} = await CDNInterface.getHttpsSetting(domain);

        if (!success)
            throw new Error('Failed on get https setting');

        return {
            success: true, result: {
                httpsReady: result.data.f_ssl_type === "arvan",
                needInit: result.data.f_ssl_type === "off"
            }
        };
    } catch (error) {
        return {
            success: false,
            error
        };
    }
};

CDNHelper.getDomainUsage = async (domain, subdomain, start, end) => {
    try{
        let {success, result} = await CDNInterface.getTrafficReport(domain, undefined, start, end, subdomain);
        
        if (!success) {
            throw new Error("getDomainUsage error ...");
        }

        return {success, result};
    } catch (error) {
        console.log("getDomainUsage error", error);
        return {success: false, error};
    }
};

module.exports = CDNHelper;