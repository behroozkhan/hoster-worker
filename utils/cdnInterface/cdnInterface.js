CDNInterface = {};

let authentication = "";
let baseUrl = "https://napi.arvancloud.com/cdn/4.0";
const getOptions = () => {
    return {
        headers: {
            'Authorization': `${process.env.CDN_AUTH || authentication}`
        }
    }
}

CDNInterface.setAuth = async (_authentication) => {
    authentication = _authentication;
}

CDNInterface.setBaseUrl = async (_baseUrl) => {
    baseUrl = _baseUrl;
}

// TODO Domain
CDNInterface.getListOfDomains = async () => {
    
}

CDNInterface.createNewDomain = async (domain) => {
    
}

CDNInterface.getDomainInfo = async (domain) => {
    
}

CDNInterface.removeDomain = async (domain, domainId) => {
    
}

CDNInterface.getCDNNS = async (domain) => {
    
}

CDNInterface.checkDomainNS = async (domain) => {
    
}
// TODO Domain

// TODO DNS
CDNInterface.dnsSummery = async (domain) => {
    
}

CDNInterface.dnsRecordList = async (domain, {search, page, per_page}) => {
    try {
        let url = `${baseUrl}/domains/${domain}/dns-records`;
        let params = {search, page, per_page};
        let response = await axios.get(url, {
            ...CDNInterface.getOptions(), ...{params}
        });

        console.log("dnsRecordList respone: ", response);
        return {success: true, result: response.data};
    } catch (error) {
        console.log("dnsRecordList error", error);
        return {success: false, error};
    }
}

CDNInterface.createDNSRecord = async (domain, {type, name, value, ttl, cloud, upstream_https, ip_filter_mode}) => {
    try {
        let url = `${baseUrl}/domains/${domain}/dns-records`;
        let body = {type, name, value, ttl, cloud, upstream_https, ip_filter_mode};
        let response = await axios.post(url, body, CDNInterface.getOptions());

        console.log("createDNSRecord respone: ", response);
        if (response.status === 201) {
            return {success: true};
        } else {
            return {success: false};
        }
    } catch (error) {
        console.log("createDNSRecord error", error);
        return {success: false, error};
    }
}

CDNInterface.getDNSRecordInfo = async (domain, dnsId) => {
    
}

CDNInterface.updateDNSRecord = async (domain, dnsId, {type, name, value, ttl, cloud, upstream_https, ip_filter_mode}) => {
    
}

CDNInterface.removeDNSRecord = async (domain, dnsId) => {
    
}
// TODO DNS

// TODO DNSSEC

// TODO DNSSEC

// TODO CDN
CDNInterface.cdnSummery = async (domain) => {
    
}

CDNInterface.getCacheSetting = async (domain) => {
    
}

CDNInterface.updateCacheSetting = async (domain, {cache_developer_mode, cache_consistent_uptime, cache_status,
    cache_page_200, cache_page_any, cache_browser, cache_scheme, cache_ignore_sc, cache_cookie, cache_args, 
    cache_arg}) => {
    
}

CDNInterface.purgeCache = async (domain, purge, purge_urls) => {
    
}

CDNInterface.getHttpsSetting = async (domain) => {
    
}

CDNInterface.updateHttpsSetting = async (domain, {f_ssl_type, f_ssl_hsts, f_ssl_max_age,
    f_ssl_subdomain, f_ssl_preload, f_ssl_redirect, replace_http}) => {
    
}

CDNInterface.updateHttpsStatus = async (domain, status) => {
    
}

CDNInterface.renewSSLCertificate = async (domain) => {
    
}
// TODO CDN

// TODO Report
CDNInterface.getTrafficReport = async (domain, period, since, until, filterSubdomain) => {
    
}

CDNInterface.getVisitorReport = async (domain, period, since, until, filterSubdomain) => {
    
}

CDNInterface.getResponseTimeReport = async (domain, period, since, until) => {
    
}

CDNInterface.getListOfErrors = async (domain, period, since, until) => {
    
}

CDNInterface.getDetailOfError = async (domain, period, since, until, error /*for search*/) => {
    
}

CDNInterface.getAttackReport = async (domain, period, detailed) => {
    
}

CDNInterface.getAttackersInfo = async (domain, period) => {
    
}

CDNInterface.getAttackedUrls = async (domain, period) => {
    
}
// TODO Report

// TODO Security
CDNInterface.getSecurityPlans = async () => {
    
}

CDNInterface.getSecurityStatus = async (domain) => {
    
}

CDNInterface.updateSecurityPlan = async (domain, plan) => {
    
}
// TODO Security

module.exports = CDNInterface;