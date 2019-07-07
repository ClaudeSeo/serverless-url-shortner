import * as url from 'url';
import * as _ from 'lodash';
import * as AWS from 'aws-sdk';
import { HTTPResponse, ShortUrlResponse } from './interface';

const config = Object.freeze({
    awsRegion: process.env.REGION || '',
    s3: {
        bucket: process.env.S3_BUCKET || '',
        prefix: process.env.S3_PREFIX || '',
    },
    shortHost: process.env.SHORT_HOST,
});

AWS.config.update({ region: config.awsRegion });

const s3 = new AWS.S3();

const generateRandomCharacter = (): string => {
    return Math.random().toString(36).substring(2, 5) + Math.random().toString(36).substring(2, 5);
};

const validateBody = async (longUrl: string | null): Promise<string> => {
    const parsed = longUrl ? url.parse(longUrl) : null;
    if (!parsed || !parsed.protocol || !parsed.host) {
        return Promise.reject({
            statusCode: 400,
            message: 'Invalid URL format'
        });
    }

    return longUrl as string;
};

const saveShortUrl = async (longUrl: string, key: string): Promise<ShortUrlResponse> => {
    const params = {
        ACL: 'public-read',
        Bucket: config.s3.bucket,
        Key: key,
        WebsiteRedirectLocation: longUrl,
    };

    return s3.putObject(params)
        .promise()
        .then(() => {
            const urlPrefix = config.shortHost ? config.shortHost : `${config.s3.bucket}.s3.${config.awsRegion}.amazonaws.com`;
            const shortUrl = `https://${urlPrefix}/${key}`;

            return {
                longUrl,
                shortUrl,
                statusCode: 201,
            };
        })
        .catch((err) => {
            return {
                statusCode: 500,
                message: err.message
            };
        });
};

const makeShortUrl = async (longUrl: string, retry: number = 0): Promise<ShortUrlResponse> => {
    if (retry > 3) {
        return {
            statusCode: 400,
            message: 'Cannot find an unused short id, aborting'
        };
    }

    const shortId = generateRandomCharacter();
    const key = `${config.s3.prefix}/${shortId}`;
    const params = { Bucket: config.s3.bucket, Key: key };

    return s3.headObject(params)
        .promise()
        .then(() => makeShortUrl(longUrl, retry + 1))
        .catch((err) => {
            if (err.code === 'NotFound') {
                return saveShortUrl(longUrl, key);
            } else {
                return {
                    statusCode: 400,
                    message: 'Could not find an suitable name, error: ' + err.code
                };
            }
        });
};

const buildResponse = async (response: ShortUrlResponse): Promise<HTTPResponse> => {
    const body = JSON.stringify(_.omit(response, 'statusCode'));

    return {
        body,
        statusCode: response.statusCode,
    };
};

export async function exec(event: any, context: any): Promise<HTTPResponse> {
    const body: any = JSON.parse(event.body);
    const longUrl: string | null = _.get(body, 'longUrl', null);

    return validateBody(longUrl)
        .then(makeShortUrl)
        .then(buildResponse)
        .catch((err) => buildResponse({ statusCode: err.statusCode, message: err.message }));
}
