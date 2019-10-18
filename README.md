# ledger-harmony-js
Javascript driver and Vue example for harmony firmware in ledger Nano S


## Install the latest ledger NanoS firmware

check https://github.com/harmony-one/ledger-app-one README.md for instructions

## Install node.js modules and run the example in Vue.js 

```
npm install
npm run serve
  App running at:
  - Local:   https://localhost:8080/ 
  - Network: https://x.x.x.x:8080/

  Note that the development build is not optimized.
  To create a production build, run npm run build.
```

## Turn off chrome localhost https certificate checking

 1. open Chrome browser (WebUSB is supported only by Chrome), 
 2. open chrome://flags/#allow-insecure-localhost to disable certificate checking
 3. open address https://localhost:8080/ 

