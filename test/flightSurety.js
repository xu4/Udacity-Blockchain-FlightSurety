
var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');

contract('Flight Surety Tests', async (accounts) => {

  var config;
  before('setup contract', async () => {
    config = await Test.Config(accounts);
    //console.log(`flightSuretyData: ${config.flightSuretyData.address}`);
    //console.log(`flightSuretyApp: ${config.flightSuretyApp.address}`);
    await config.flightSuretyData.authorizeContract(config.flightSuretyApp.address);
  });

  /****************************************************************************************/
  /* Operations and Settings                                                              */
  /****************************************************************************************/


  it(`(multiparty) has correct initial isOperational() value`, async function () {

    // Get operating status
    let status = await config.flightSuretyData.isOperational.call();
    //console.log(`flightSuretyData.isOperational: ${status}`);
    assert.equal(status, true, "Incorrect initial operating status value");

  });



  it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {

      // Ensure that access is denied for non-Contract Owner account
      let accessDenied = false;
      try 
      {
          await config.flightSuretyData.setOperatingStatus(false, { from: config.testAddresses[2] });
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, true, "Access is not restricted to Contract Owner");
            
  });
  

  it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {

      // Ensure that access is allowed for Contract Owner account
      let accessDenied = false;
      try 
      {
          await config.flightSuretyData.setOperatingStatus(false);
      }
      catch(e) {
          accessDenied = true;
     }
      assert.equal(accessDenied, false, "Access is not allowd to Contract Owner");
      
  });


  it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {

      await config.flightSuretyData.setOperatingStatus(false);

      let reverted = false;
      try 
      {
          await config.flightSuretyData.setTestingMode(true);
      }
      catch(e) {
          reverted = true;
          console.log(e.message);
      }
      assert.equal(reverted, true, "Access not blocked for requireIsOperational");      

      // Set it back for other tests to work
      await config.flightSuretyData.setOperatingStatus(true);

  });

  it('(airline) First Airline is registered when contract is deployed.', async () => {
    
    // ARRANGE
    let firstAirline = accounts[1];
    //console.log(`First Airline: ${firstAirline}`);

    //let airlineInfo = await config.flightSuretyData.fetchAirline(firstAirline);
    //console.log(`${airlineInfo[0]}, ${airlineInfo[1]}, ${airlineInfo[2]}, ${airlineInfo[3]}`);


    let result = false;

    // ACT
    try {
      result = await config.flightSuretyData.isAirlineRegistered(firstAirline);
    }
    catch(e) {
        console.log(e.message);
    }
    // ASSERT
    assert.equal(result, true, "First Airline is not registered when contract is deployed.");


  });



  it('(Contract Owner) authorizeContract and deauthorizeContract', async () => {
        let appContract = config.flightSuretyApp.address;
        //console.log(`flightSuretyApp: ${appContract}`);
        let result =false;

        let anotherContract = accounts[2];

        try {
          await config.flightSuretyData.authorizeContract(anotherContract);

          result = await config.flightSuretyData.fetchAuthorizedContract(anotherContract);
          //console.log(`authorizeContract: ${result}`);
        }
      catch(e) {
          console.log(e.message);
      }

        assert.equal(result, true, " contract is not authorized");

      try {
          await config.flightSuretyData.deauthorizeContract(anotherContract);

          result = await config.flightSuretyData.fetchAuthorizedContract(anotherContract);
          //console.log(`authorizeContract: ${result}`);
        }
      catch(e) {
          console.log(e.message);

      }

      assert.equal(result, false, " contract is not deauthorized");
   });






  it('(airline) Only existing funded airline may register a new airline when there is fewer than four airlines registered', async () => {
    
    // ARRANGE
    
    let newAirline = [accounts[2],accounts[3],accounts[4]];
    let size = 0;
    let result = false;
    let existingAirline = config.firstAirline;
    let amount= web3.toWei(10, "ether");
    let funded = false;

    for (var i = 0; i < newAirline.length; i++)
    {    
        result = false;
        //size = await config.flightSuretyData.fetchNumberOfAirline();
        //console.log(`fetchNumberOfAirline, before Registering, ${size}`);
        try{
          await config.flightSuretyApp.fund( {from: existingAirline, value: amount});
          //funded = await config.flightSuretyData.isAirlineFunded(existingAirline);
          //console.log(`${existingAirline} isFunded: ${funded}`);

          await config.flightSuretyApp.registerAirline(newAirline[i], "Airline"+i, {from: existingAirline});
          existingAirline = newAirline[i];

          //size  = await config.flightSuretyData.fetchNumberOfAirline();
          //console.log(`fetchNumberOfAirline after Registering, ${size}`);

          result = await config.flightSuretyApp.isAirlineRegistered(newAirline[i]);
        }catch(e) {
            console.log(e.message);
            result = false;
        }
           // ASSERT
        assert.equal(result, true, "not able to register a new airline when there's fewer than 4 registered funded airlines.");

      }

   
 
  });





   it('(airline) Registration of fifth and subsequent airlines requires multi-party consensus of 50% of registered airlines', async () => {
    

    let size = 0;
    let result = false;
    let existingAirlines = [config.firstAirline,accounts[2], accounts[3], accounts[4]];
    // only the first 3 airline is funded.

    let fifthAirline = accounts[5];
    let amount= web3.toWei(10, "ether");
    let funded = false;

    // ACT
    try {

    //the first two new airlines register/vote for the fifth airline , the third new airline is not funded. 
    for (var i = 0; i < existingAirlines.length-1; i++)
      {
         await config.flightSuretyApp.castVoteForNewAirline(fifthAirline, {from: existingAirlines[i]});

      }

      await config.flightSuretyApp.registerAirline(fifthAirline, "Delta", {from: config.firstAirline});
      result = await config.flightSuretyApp.isAirlineRegistered(fifthAirline);
    }
    catch(e) {
        console.log(e.message);
    }

    assert.equal(result, true, "fifth airline can't be registerd even it has half of the consensus.");

 
  });




it('(airline) Registration of sixth  airlines is rejected without consensus of 50% of registered airlines', async () => {
    
    // ARRANGE
    
    let existingAirline = [config.firstAirline,accounts[2], accounts[3], accounts[4], accounts[5]];;
    let size = 0;
    let result = false;
   
    let sixthAirline = accounts[6];
    let funded = false;
    let amount= web3.toWei(10, "ether");

    // ACT
    try {

     
      result =true;

      //only one new airline voted, less than 50% consensus, repeated vote doesn't count
      await config.flightSuretyApp.castVoteForNewAirline(sixthAirline, {from: existingAirline[0]});
    
      /*    
      let number = await config.flightSuretyData.fetchNumberOfAirline();
      let votes = await config.flightSuretyData.fetchVotes(sixthAirline);
      console.log("Number of airline:" + number +", vote for "+ sixthAirline+": "+votes);
      */
      await config.flightSuretyApp.registerAirline(sixthAirline, "Airline6", {from: existingAirline[0]});

      result = await config.flightSuretyApp.isAirlineRegistered(sixthAirline);
 
    }
    catch(e) {
        console.log(e.message);
    }

    // 4 registered airline, need 2 votes, but only have 1 vote.
    assert.equal(result, false, "sixth airline can be registerd even it doesn't have half of the consensus.");

 
  });




  it('(airline) register flight', async () => {

    let result = false;
    let flight = 'ND1309'; // Course number
    let timestamp = Math.floor(Date.now() / 1000);
    
    //amount = web3.utils.toWei(amount.toString(), 'ether');
    //let amount= web3.toWei(10, "ether");


    try {

        //await config.flightSuretyApp.fund({from: config.firstAirline, value:amount});
        //result = await config.flightSuretyApp.getFlightKey(config.firstAirline, flight, timestamp, { from: config.firstAirline});
        //console.log(`${result}`) ;
        await config.flightSuretyApp.registerFlight(flight, timestamp, { from: config.firstAirline});

        result = await config.flightSuretyApp.getFlightInfo(flight, timestamp, { from: config.firstAirline});
        //console.log(`${result}`) ;

    }catch(e) {
        console.log(e.message);
        result = false;
    }

    assert.equal(result, true, "first flight is not registered correctly.");

 
  });



  it('(passenger) buy insurance', async () => {

    let result = 0 ;
    let flight = 'ND1309'; // Course number
    let timestamp = Math.floor(Date.now() / 1000);
    
    //amount = web3.utils.toWei(amount.toString(), 'ether');
    let amount= web3.toWei(1, "ether");
    let passenger1 = accounts[6];

    try {

        await config.flightSuretyApp.registerFlight(flight, timestamp, { from: config.firstAirline});
        //console.log(`buy ${config.firstAirline} ${flight} ${timestamp} ${amount}  ${passenger1}`) ;

        await config.flightSuretyData.buy(config.firstAirline, flight , timestamp,   { from: passenger1, value: amount});
        
        result = await config.flightSuretyData.fetchPurchasedInsuranceAmount(config.firstAirline, flight, timestamp, passenger1);

        //console.log(`${timestamp}, ${result[0]}, ${result[1]}, ${result[2]}`);
       // console.log(`fetchPurchasedInsuranceAmount ${result}`) ;

    }catch(e) {
        console.log(e.message);
    }

    assert.equal(result, amount, "Passenger is not able to buy flight insurance.");

 
  });


});
