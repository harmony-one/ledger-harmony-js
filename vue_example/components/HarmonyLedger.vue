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
import HarmonyApp from '../../src';

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
            const response = await app.publicKey();
            if (response.return_code !== 0x9000) {
                this.log(`Error [${response.return_code}] ${response.error_message}`);
                return;
            }

            this.log('Harmony one address for ledger is:');
            this.log(response.one_address);
        },
        async signTx() {
            this.deviceLog = [];

            // Given a transport (U2F/HIF/WebUSB) it is possible instantiate the app
            const transport = await this.getTransport();
            const app = new HarmonyApp(transport);

            const message = 'e608808252080180940c807574be624ccdff7a7dd64c7add4dc92dd0a9880de0b6b3a764000080';
            const response = await app.signTx(message);

            this.log('Response received!');
            this.log('Full response:');
            this.log(response.signature.toString('hex'));
        },
        async signStake() {
            this.deviceLog = [];

            // Given a transport (U2F/HIF/WebUSB) it is possible instantiate the app
            const transport = await this.getTransport();
            const app = new HarmonyApp(transport);

            // raw staking packet generated from go-CLI
            // ./hmy staking delegate --delegator one1q6gkzcap0uruuu8r6sldxuu47pd4ww9w9t7tg6 \
            // --validator one15l3pj0v9a8gfkdatd5hpj029kvc4mlr6r5djmg \
            // --gas-price 2  --amount 12345 --passphrase "harmony-one" --ledger \

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
