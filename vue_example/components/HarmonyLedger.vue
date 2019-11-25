<template>
  <div class="harmonyLedger">
    <input
      id="webusb"
      v-model="transportChoice"
      type="radio"
      value="WebUSB"
    >
    <label for="webusb">WebUSB</label>
    <input
      id="u2f"
      v-model="transportChoice"
      type="radio"
      value="U2F"
    >
    <label for="u2f">U2F</label>
    <br>
    <!--
        Commands
    -->
    <button @click="getVersion">
      Get Version
    </button>

    <button @click="showAddress">
      Show Address
    </button>

    <button @click="signTx">
      Sign Example TX
    </button>

    <button @click="signStake">
      Sign Example StakeTx
    </button>
    <!--
        Commands
    -->
    <ul id="ledger-status">
      <li
        v-for="item in ledgerStatus"
        :key="item.index"
      >
        {{ item.msg }}
      </li>
    </ul>
  </div>
</template>

<script>
// eslint-disable-next-line import/no-extraneous-dependencies
import TransportWebUSB from '@ledgerhq/hw-transport-webusb';
// eslint-disable-next-line import/no-extraneous-dependencies
import TransportU2F from '@ledgerhq/hw-transport-u2f';
import {
    arrayify, hexlify, stripZeros, encode,
} from '@harmony-js/crypto';
import HarmonyApp from '../../src';

const { Harmony } = require('@harmony-js/core');

// import or require settings
const { ChainID, ChainType } = require('@harmony-js/utils');

const URL_TESTNET = 'https://api.s0.b.hmny.io';
// const URL_MAINNET = 'https://api.s0.t.hmny.io';

const harmony = new Harmony(
    // rpc url
    URL_TESTNET,
    {
        // chainType set to Harmony
        chainType: ChainType.Harmony,
        // chainType set to HmyLocal
        chainId: ChainID.HmyTestnet,
    },
);


export default {
    name: 'HarmonyLedger',
    props: {
    },
    data() {
        return {
            deviceLog: [],
            transportChoice: 'U2F',
        };
    },
    computed: {
        ledgerStatus() {
            return this.deviceLog;
        },
    },
    methods: {
        log(msg) {
            this.deviceLog.push({
                index: this.deviceLog.length,
                msg,
            });
        },
        async getTransport() {
            let transport = null;

            this.log(`Trying to connect via ${this.transportChoice}...`);
            if (this.transportChoice === 'WebUSB') {
                try {
                    transport = await TransportWebUSB.create();
                } catch (e) {
                    this.log(e);
                }
            }

            if (this.transportChoice === 'U2F') {
                try {
                    transport = await TransportU2F.create(10000);
                } catch (e) {
                    this.log(e);
                }
            }

            return transport;
        },
        async getVersion() {
            this.deviceLog = [];

            // Given a transport (U2F/HIF/WebUSB) it is possible instantiate the app
            const transport = await this.getTransport();
            const app = new HarmonyApp(transport);

            // now it is possible to access all commands in the app
            const response = await app.getVersion();
            if (response.return_code !== 0x9000) {
                this.log(`Error [${response.return_code}] ${response.error_message}`);
                return;
            }

            this.log('Response received!');
            this.log(`App Version ${response.major}.${response.minor}.${response.patch}`);
            this.log('Full response:');
            this.log(response);
        },
        async showAddress() {
            this.deviceLog = [];

            // Given a transport (U2F/HIF/WebUSB) it is possible instantiate the app
            const transport = await this.getTransport();
            const app = new HarmonyApp(transport);

            // now it is possible to access all commands in the app
            const response = await app.publicKey(false);
            if (response.return_code !== 0x9000) {
                this.log(`Error [${response.return_code}] ${response.error_message}`);
                return;
            }
            const address = response.one_address.toString();
            this.log('Harmony one address for ledger is:');
            this.log(address);
        },
        async signTx() {
            this.deviceLog = [];

            // Given a transport (U2F/HIF/WebUSB) it is possible instantiate the app
            const transport = await this.getTransport();
            const app = new HarmonyApp(transport);
            let response = await app.publicKey(true);
            if (response.return_code !== 0x9000) {
                this.log(`Error [${response.return_code}] ${response.error_message}`);
                return;
            }
            this.log('Harmony one address for ledger is:');
            this.log(response.one_address.toString());
            const accountNonce = await HarmonyApp.getAccountShardNonce(
                response.one_address.toString(), 0, harmony.messenger,
            );
            const txn = harmony.transactions.newTx({
                //  token send to
                to: 'one1sl6hku7wxgxnhajrc0a96p6zpea6qr0p0sqajk',
                nonce: accountNonce,
                // amount to send
                value: '100000000000000000',
                // gas limit, you can use string
                gasLimit: '210000',
                shardID: 0,
                toShardID: 1,
                gasPrice: new harmony.utils.Unit('100').asGwei().toWei(),
            });

            const [unsignedRawTransaction, raw] = txn.getRLPUnsigned();
            response = await app.signTx(unsignedRawTransaction);
            const bytes = response.signature;
            const r = hexlify(bytes.slice(0, 32));
            const s = hexlify(bytes.slice(32, 64));
            let v = bytes[64];
            if (v !== 27 && v !== 28) {
                v = 27 + (v % 2);
            }
            // const signed = txn.getRLPSigned(raw, signature);
            // replace empty r,s,v with signature r,s,v
            raw.pop();
            raw.pop();
            raw.pop();
            v += harmony.chainId * 2 + 8;
            raw.push(hexlify(v));
            raw.push(stripZeros(arrayify(r) || []));
            raw.push(stripZeros(arrayify(s) || []));

            const encodedRaw = encode(raw);
            txn.setParams({ ...txn.txParams, rawTransaction: encodedRaw });

            // Frontend received back the signedTxn and do the followings to Send transaction.
            txn.observed()
                .on('transactionHash', (txnHash) => {
                    console.log('');
                    console.log('--- hash ---');
                    console.log('');
                    console.log(txnHash);
                    this.log('txHash = ');
                    this.log(txnHash.toString());
                    console.log('');
                })
                .on('receipt', (receipt) => {
                    console.log('');
                    console.log('--- receipt ---');
                    console.log('');
                    console.log(receipt);
                    console.log('');
                })
                .on('cxReceipt', (receipt) => {
                    console.log('');
                    console.log('--- cxReceipt ---');
                    console.log('');
                    console.log(receipt);
                    console.log('');
                })
                .on('error', (error) => {
                    console.log('');
                    console.log('--- error ---');
                    console.log('');
                    console.log(error);
                    this.log('error = ', error.toString());
                    console.log('');
                });

            // send the txn, get [Transaction, transactionHash] as result

            const [sentTxn, txnHash] = await txn.sendTransaction();

            // to confirm the result if it is already there

            const confiremdTxn = await sentTxn.confirm(txnHash);

            // if the transactino is cross-shard transaction
            if (!confiremdTxn.isCrossShard()) {
                if (confiremdTxn.isConfirmed()) {
                    console.log('--- Result ---');
                    console.log('');
                    console.log('Normal transaction');
                    console.log(`${txnHash} is confirmed`);
                    console.log('');
                    process.exit();
                }
            }
            if (confiremdTxn.isConfirmed() && confiremdTxn.isCxConfirmed()) {
                console.log('--- Result ---');
                console.log('');
                console.log('Cross-Shard transaction');
                console.log(`${txnHash} is confirmed`);
                console.log('');
                process.exit();
            }
        },
        async signStake() {
            this.deviceLog = [];

            // Given a transport (U2F/HIF/WebUSB) it is possible instantiate the app
            const transport = await this.getTransport();
            const app = new HarmonyApp(transport);

            const message = 'f9017580f901649406916163a17f07ce70e3d43ed37395f05b5738aef87d966861726d6f6e79207374616b696e67206c6564676572907374616b696e67206964656e746974798b6861726d6f6e792e6f6e65b840636f6e746163742020206173646661736473646661207364662061736466617364667361646673616466617364666173646661736466736466736466617364668664657461696cdcc8872bb2c8eabcc000c988b37ecc7904e70000c887b1a2bc2ec50000894136fa8e3b9aec000089bb59a27953c6000000f893b05eb1eec590b2a763da7454b49c13e331b41816853d1b70a7868989dbdf63b450339983cd3020c974f4fc23e2a4475116b05eb1eec590b2a763da7454b49c13e331b41816853d1b70a7868989dbdf63b450339983cd3020c974f4fc23e2a4475116b05eb1eec590b2a763da7454b49c13e331b41816853d1b70a7868989dbdf63b450339983cd3020c974f4fc23e2a44751168942e530adfce0080000808504a817c800825208028080';
            this.log('Start signing');
            const response = await app.signStake(message);
            this.log('Response received!');
            this.log('Full response:');
            this.log(response.signature.toString('hex'));
        },
    },
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
    h3 {
        margin: 40px 0 0;
    }

    button {
        padding: 5px;
        font-weight: bold;
        font-size: medium;
    }

    ul {
        padding: 10px;
        text-align: left;
        alignment: left;
        list-style-type: none;
        background: black;
        font-weight: bold;
        color: greenyellow;
    }
</style>
