const crypto = require('crypto');
const OAuth = require('oauth-1.0a');
const axios = require('axios');
const fs = require('fs');

const OAuthHelper = (mediaUrl) => {
    const oauth = OAuth({
        consumer: {
            key: 'gjUjLgCMVLuszwXU8XE82ADMp',
            secret: 'rBskW2kcFIir60EUolPQ568qo3eYhwrCBW2Wg5mbsQirUbHAtP'
        },
        signature_method: 'HMAC-SHA1',
        hash_function(base_string, key) {
            return crypto.createHmac('sha1', key).update(base_string).digest('base64');
        }
    });

    const authorization = oauth.authorize({
        url: mediaUrl,
        method: 'GET'
    }, {
        key: '1324886342862450696-fhBRg6NGGMtlcfbHeZlAaZJqZuGdiR',
        secret: 'eN1TrUYZHZcCScggdghyi1qvCXCwO5okfsvP8C9CqGVNP'
    });

    return oauth.toHeader(authorization);
};

const downloadMedia = async (mediaUrl, fileName) => {
    try {
        console.log('DOWNLOADING MEDIA..........');
        const authorization = OAuthHelper(mediaUrl);
        const { data } = await axios.get(
            mediaUrl, 
            {
                headers: authorization,
                responseType: 'arraybuffer'
            }
        );
        fs.writeFileSync(fileName, data);
        console.log('MEDIA DOWNLOADED!');
        return data;
    } catch (error) {
        throw new Error('error from downloading media.');
    }
};

module.exports = { downloadMedia };
