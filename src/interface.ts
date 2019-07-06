export interface HTTPResponse {
    statusCode: number,
    body: string
}

export interface ShortUrlResponse {
    statusCode: number,
    message?: string,
    longUrl?: string,
    shortUrl?: string,
}
