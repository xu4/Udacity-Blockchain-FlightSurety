
var Test = require('../config/testConfig.js');
//var BigNumber = require('bignumber.js');

contract('Oracles', async (accounts) => {

  const TEST_ORACLES_COUNT = 15;
  var config;
  const STATUS_CODE_UNKNOWN = 0;
  const STATUS_CODE_ON_TIME = 10;
  const STATUS_CODE_LATE_AIRLINE = 20;
  const STATUS_CODE_LATE_WEATHER = 30;
  const STATUS_CODE_LATE_TECHNICAL = 40;
  const STATUS_CODE_LATE_OTHER = 50;

  const statusCodeArr = [STATUS_CODE_UNKNOWN,STATUS_CODE_ON_TIME,STATUS_CODE_LATE_AIRLINE,STATUS_CODE_LATE_WEATHER,STATUS_CODE_LATE_TECHNICAL,STATUS_CODE_LATE_OTHER];

  before('setup contract', async () => {
    config = await Test.Config(accounts);

    await config.flightSuretyData.authorizeContract(config.flightSuretyApp.address);

  });


  it('can register oracles', async () => {
    
    // ARRANGE
    let fee = await config.flightSuretyApp.REGISTRATION_FEE.call();

    // ACT
    for(let a=1; a<TEST_ORACLES_COUNT; a++) {      
      await config.flightSuretyApp.registerOracle({ from: accounts[a], value: fee });
      let result = await config.flightSuretyApp.getMyIndexes.call({from: accounts[a]});
      console.log(`Oracle Registered: ${result[0]}, ${result[1]}, ${result[2]}`);
    }
  });


  it('can request flight status', async () => {

     function timeout(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function generateStatusCode(){

       return  statusCodeArr[Math.floor(Math.random()*statusCodeArr.length)]
                 
    }

     // register oralces
    let fee = await config.flightSuretyApp.REGISTRATION_FEE.call();

    for(let a=1; a<TEST_ORACLES_COUNT; a++) {      
      await config.flightSuretyApp.registerOracle({ from: accounts[a], value: fee });
      let result = await config.flightSuretyApp.getMyIndexes.call({from: accounts[a]});
      console.log(`Oracle Registered: ${result[0]}, ${result[1]}, ${result[2]}`);
    }


    
    // watch events
    let flight = 'ND1309'; // Course number
    let timestamp = Math.floor(Date.now() / 1000);
    let index = -1;
    //let statusCode = generateStatusCode();

    let statusCode = STATUS_CODE_LATE_AIRLINE;

    let fundAmount= web3.toWei(10, "ether");
    let insuranceAmount= web3.toWei(0.1, "ether");
    let passenger1 = accounts[TEST_ORACLES_COUNT+1];
    let passenger2 = accounts[TEST_ORACLES_COUNT+2];


    var eventCreditInsuree = config.flightSuretyData.creditInsuree();
    await eventCreditInsuree.watch(async(err, res) => {
        console.log(`Event CreditInsuree, ${res.args.payout}, ${res.args.balance}`);
    })

    var eventBuyInsuree = config.flightSuretyData.buyInsurance();
    await eventBuyInsuree.watch(async(err, res) => {
        console.log(`eventBuyInsuree, ${res.args.insuranceAmount},  ${res.args.origValue}, ${res.args.buyer}`);
    })

  var eventWithdrawCredit = config.flightSuretyData.withdrawCredit();
    await eventWithdrawCredit.watch(async(err, res) => {
        console.log(`eventWithdrawCredit, ${res.args.owner},  ${res.args.credit}`);
    })

    var eventOracleRequest = config.flightSuretyApp.OracleRequest();
    
    //Oralce submit response after receiving OracleRequest event
    await eventOracleRequest.watch(async(err, res) => {
        index = res.args.index;
        console.log(`Oracle Request, index is ${index}`);
    })


    var eventOracleReport = config.flightSuretyApp.OracleReport();
    await eventOracleReport .watch((err, res) => {
        console.log(`Event Oracle OracleReport, ${res.args.flight}, ${res.args.status}`);
        
     })

    //verify flight status after event emitted.
    var eventFlightStatus = config.flightSuretyApp.FlightStatusInfo();
    await eventFlightStatus.watch(async(err, res) => {
        console.log(`Event FlightStatusInfo, ${res.args.flight}, ${res.args.status}`);

        
     })

    await config.flightSuretyApp.fund( {from: config.firstAirline, value: fundAmount});
    await config.flightSuretyApp.registerFlight(flight, timestamp, { from: config.firstAirline});

    //buy insurance
    await config.flightSuretyData.buy(config.firstAirline, flight, timestamp, { from: passenger1, value: insuranceAmount});
    console.log(`passenger1 buy insurance, ${passenger1}, ${insuranceAmount}`);

    await config.flightSuretyData.buy(config.firstAirline, flight, timestamp, { from: passenger2, value: insuranceAmount*2});
    console.log(`passenger2 buy insurance, ${passenger2}, ${insuranceAmount*2}`);


    let creditBalance1 = await config.flightSuretyApp.checkCredit({ from: passenger1});
    console.log(`creditBalance1 ${creditBalance1} `);


    let creditBalance2 = await config.flightSuretyApp.checkCredit({ from: passenger2});
    console.log(`creditBalance2 ${creditBalance2}  `);

    // Submit a request for oracles to get status information for a flight
    await config.flightSuretyApp.fetchFlightStatus(config.firstAirline, flight, timestamp);

    await timeout(5000);



    // Since the Index assigned to each test account is opaque by design
    // loop through all the accounts and for each account, all its Indexes (indices?)
    // and submit a response. The contract will reject a submission if it was
    // not requested so while sub-optimal, it's a good test of that feature
    for(let a=1; a<TEST_ORACLES_COUNT; a++) {

      // Get oracle information
      let oracleIndexes = await config.flightSuretyApp.getMyIndexes.call({ from: accounts[a]});

      //console.log(`Oracle ${accounts[a]}  indexes:${oracleIndexes[0]},${oracleIndexes[1]}, ${oracleIndexes[2]} `);
               

      for(let idx=0;idx<3;idx++) {
                
        try {
          //console.log(`Oracle ${accounts[a]}, ${oracleIndexes[idx]}  ${oracleIndexes[idx] - index}, ${(oracleIndexes[idx] >index )},  ${(oracleIndexes[idx] < index )}`);
          //console.log(`Oracle ${oracleIndexes[idx]}`);
          // Submit a response...it will only be accepted if there is an Index match
          if((oracleIndexes[idx] >index ) == false &&  (oracleIndexes[idx] < index) == false){
          //console.log(`${accounts[a]} submitOracleResponse for index: ${index} ${config.firstAirline} ${flight} ${timestamp}  ${STATUS_CODE_ON_TIME} `);
          console.log(`Oracle ${accounts[a]} submitOracleResponse for index:${index}`);
          await config.flightSuretyApp.submitOracleResponse(index, config.firstAirline, flight, timestamp, statusCode, { from: accounts[a] });
          await timeout(2000);
          }
        } catch(e) {
              // Enable this when debugging
               console.log('\nError', e.message, idx, oracleIndexes[idx].toNumber(), flight, timestamp);
        }

      }
    }

    await timeout(5000);
    let result = -1;

    try {
      result = await config.flightSuretyApp.viewFlightStatus(config.firstAirline, flight, timestamp);
              
    }catch(e) {
      console.log('\nError', e.message);

    }
    console.log(`Flight Status ${result}`);
    assert.equal(result, statusCode, "Not able to request Flight Status ");

    creditBalance1 = await config.flightSuretyApp.checkCredit({ from: passenger1});
    console.log(`creditBalance1 ${creditBalance1}`);

    creditBalance2 = await config.flightSuretyApp.checkCredit({ from: passenger2});
    console.log(`creditBalance2 ${creditBalance2}`);


    let expectedCredit1 = web3.toWei(0.15, "ether");
    assert.equal(creditBalance1, expectedCredit1, "credit for airline late status is wrong.");

    let expectedCredit2 = web3.toWei(0.3, "ether");
    assert.equal(creditBalance2, expectedCredit2, "credit for airline late status is wrong.");



    let passengerBeforeBalance = await web3.eth.getBalance(passenger1)
    console.log(`passenger before Balance ${passengerBeforeBalance}`);

    await config.flightSuretyApp.withdrawCredit({ from: passenger1});

    creditBalance1 = await config.flightSuretyApp.checkCredit({ from: passenger1});
    assert.equal(creditBalance1, 0, "withdraw amount is wrong.");

    console.log(`creditBalance ${creditBalance1}`);

//need to check passenger1's balance is credited.
    let passengerAfterBalance = await web3.eth.getBalance(passenger1)

    console.log(`passenger after Balance ${passengerAfterBalance}`);

    result = (passengerAfterBalance -passengerBeforeBalance) > 0;
    console.log(`AfterBalance is larger than BeforeBalance: ${result}`);

    assert.equal(result, true, "passenger1's account is not credited properly.");
   
  });
   

});
