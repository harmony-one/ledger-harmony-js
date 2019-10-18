/*
 * Copyright (c) 2018-2019 Simple Rules Company.
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
 */

const CLA = 0xE0;

const INS = {
    GET_VERSION: 0x01,
    GET_PUBLIC_KEY: 0x02,
    SIGN_STAKING: 0x04,
    SIGN_TX: 0x08,
};

function hexToBytes(hex) {
    const bytes = [];
    for (let c = 0; c < hex.length; c += 2) {
        bytes.push(parseInt(hex.substr(c, 2), 16));
    }
    return bytes;
}

function processErrorResponse(response) {
    return {
        return_code: response.statusCode,
    };
}

export default class HarmonyApp {
    constructor(transport, scrambleKey = 'CSM') {
        if (typeof transport === 'undefined') {
            throw new Error('Transport has not been defined');
        }
        this.transport = transport;
        transport.decorateAppAPIMethods(
            this,
            [
                'getVersion',
                'publicKey',
                'signTx',
                'signStake',
            ],
            scrambleKey,
        );
    }

    async getVersion() {
        return this.transport.send(CLA, INS.GET_VERSION, 0, 0)
            .then(
                (response) => {
                    const errorCodeData = response.slice(-2);
                    const returnCode = errorCodeData[0] * 256 + errorCodeData[1];
                    console.log('get version response is');
                    console.log(response);
                    return {
                        return_code: returnCode,
                        // ///
                        test_mode: false,
                        major: response[0],
                        minor: response[1],
                        patch: response[2],
                    };
                },
                processErrorResponse,
            );
    }

    async publicKey() {
        return this.transport.send(CLA, INS.GET_PUBLIC_KEY, 0, 1)
            .then(
                (response) => {
                    const errorCodeData = response.slice(-2);
                    const returnCode = errorCodeData[0] * 256 + errorCodeData[1];
                    const pk = Buffer.from(response.slice(0, 42));
                    return {
                        one_address: pk,
                        return_code: returnCode,
                    };
                },
                processErrorResponse,
            );
    }

    async signTx(message) {
        const p = hexToBytes(message);
        return this.transport.send(CLA, INS.SIGN_TX, 0, 0, Buffer.from(p))
            .then(
                async (response) => {
                    const sig = Buffer.from(response.slice(0, 65));
                    return {
                        signature: sig,
                    };
                },
                processErrorResponse,
            );
    }

    async signStake(message) {
        const p = hexToBytes(message);
        return this.transport.send(CLA, INS.SIGN_STAKING, 0, 0, Buffer.from(p))
            .then(
                async (response) => {
                    const sig = Buffer.from(response.slice(0, 65));
                    return {
                        signature: sig,
                    };
                },
                processErrorResponse,
            );
    }
}
