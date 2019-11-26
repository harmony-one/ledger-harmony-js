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
const {
    Description,
    Decimal,
    CommissionRate,
    StakingTransaction,
    CreateValidator,
} = require('@harmony-js/staking');

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
            const transport = await this.getTransport();
            const app = new HarmonyApp(transport);

            const shardStructure = await harmony.blockchain.getShardingStructure();
            harmony.shardingStructures(shardStructure.result);

            let response = await app.publicKey(true);
            if (response.return_code !== 0x9000) {
                this.log(`Error [${response.return_code}] ${response.error_message}`);
                return;
            }
            const address = response.one_address.toString();

            this.log('Harmony one address for ledger is:');
            this.log(address);
            const accountNonce = await HarmonyApp.getAccountShardNonce(
                address, 0, harmony.messenger,
            );

            const desc = new Description('Alice', 'alice', 'alice.harmony.one', 'Bob', "Don't mess with me!!!");
            const rate = new Decimal('0.1');
            const max = new Decimal('0.9');
            const change = new Decimal('0.05');

            const commission = new CommissionRate(rate, max, change);
            const createMsg = new CreateValidator(
                'one1q6gkzcap0uruuu8r6sldxuu47pd4ww9w9t7tg6',
                desc,
                commission,
                '0x8AC7230489E80000',
                '0xA2A15D09519BE00000',
                [
                    '0xb9486167ab9087ab818dc4ce026edb5bf216863364c32e42df2af03c5ced1ad181e7d12f0e6dd5307a73b62247608611',
                ],
                '0x56BC75E2D63100000', // 0x56BC75E2D63100000
            );

            const stakingTxn = new StakingTransaction('0x', createMsg, 0, '0x', '0x0927c0', 2, 2, '', '', harmony.messenger);
            stakingTxn.setNonce(accountNonce);
            stakingTxn.setFromAddress(address);

            const [unsignedRawTransaction, raw] = stakingTxn.encode();
            stakingTxn.setUnsigned(unsignedRawTransaction);

            console.log(unsignedRawTransaction);
            response = await app.signStake(unsignedRawTransaction);
            console.log('signature = ', response.signature.toString('hex'));
            const bytes = response.signature;
            const r = hexlify(bytes.slice(0, 32));
            const s = hexlify(bytes.slice(32, 64));
            let v = bytes[64];
            if (v !== 27 && v !== 28) {
                v = 27 + (v % 2);
            }
            // const signed = txn.getRLPSigned(raw, signature);
            console.log(r, s, v);
            // replace empty r,s,v with signature r,s,v
            raw.pop();
            raw.pop();
            raw.pop();
            v += harmony.chainId * 2 + 8;
            raw.push(hexlify(v));
            raw.push(stripZeros(arrayify(r) || []));
            raw.push(stripZeros(arrayify(s) || []));
            console.log('v=', v, 's=', s, 'r=', r);
            const encodedRaw = encode(raw);
            console.log('encoded raw is:');
            console.log(encodedRaw);
            stakingTxn.setRawTransaction(encodedRaw);
            console.log(stakingTxn);

            stakingTxn.observed()
                .on('transactionHash', (txnHash) => {
                    console.log('');
                    console.log('--- hash ---');
                    console.log('');
                    console.log(txnHash);
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
                    console.log('');
                });

            // console.log(signedTxn);
            const [sentTxn, txnHash] = await stakingTxn.sendTransaction();

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
