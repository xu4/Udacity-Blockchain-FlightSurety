import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import Config from './config.json';
import Web3 from 'web3';

export default class Contract {
    constructor(network, callback) {

        this.config  = Config[network];

        this.web3 = new Web3(new Web3.providers.HttpProvider(this.config.url));
        this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, this.config.appAddress);
        this.flightSuretyData = new this.web3.eth.Contract(FlightSuretyData.abi, this.config.dataAddress);
       
        this.initialize(callback);
        this.owner = null;
        this.airlines = [];
        this.passengers = [];
        this.firstAirline = null;
        this.passengerIndex = 0;

        this.flights=[];
    }
    
    timeout(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    


    initialize(callback) {
        this.web3.eth.getAccounts(async(error, accts) => {
           
            this.owner = accts[0];
            this.firstAirline = accts[1];
            let counter = 2;
            let flightIndex = 0;

            while(this.passengers.length < 3) {
                this.passengers.push(accts[counter++]);
            }

             let flightOneInfo = {
                flightNumber: "AA105",
                flightTimestamp: Math.floor(Date.now() / 1000)
            } 
            this.flights.push(flightOneInfo);

            let flightTwoInfo = {
                flightNumber: "AA291",
                flightTimestamp: Math.floor(Date.now() / 1000)
            } 
            this.flights.push(flightTwoInfo);

            let flightThreeInfo = {
                flightNumber: "AA870",
                flightTimestamp: Math.floor(Date.now() / 1000)
            } 

            this.flights.push(flightThreeInfo);

         
         
            
            this.authorizeContract( (error, result) => {
                console.log(`Contract is authorizeContract.`);

               let self = this;

                self.fundAirline( (error, result) => {
                     console.log(`${self.firstAirline} is Funded.`);

                    self.registerFlight(self.flights[0],  (error, result) => {

                        self.getFlightInfo(self.flights[0],  (error, result) => {});
                    });
           
                    self.registerFlight(self.flights[1],  (error, result) => {
                        self.getFlightInfo(self.flights[1],  (error, result) => {});
                     });
           

                    self.registerFlight(self.flights[2],  (error, result) => {
                        self.getFlightInfo(self.flights[2],  (error, result) => {});
                    });
                });

             });

          /*
            console.log(`getFlightKey ${this.firstAirline}, ${this.flights[0].flightNumber}, ${this.flights[0].flightTimestamp}`);
            this.flightSuretyApp.methods
            .getFlightKey(this.firstAirline, this.flights[0].flightNumber, this.flights[0].flightTimestamp )
            .call({ from: this.firstAirline}, (error, result) => {
                console.log(`getFlightKey result ${error}, ${result}`);
            });

            this.isAirlineRegistered(this.firstAirline,  (error, result) => {
                 console.log(`${this.firstAirline} registered: ${result}`);

             });

             this.fetchAirline((error, result) => {
                 console.log(`fetchAirline: ${result[0]}, ${result[1]}, ${result[2]},${result[3]}`);

             });

            this.isAirlineFunded(this.firstAirline,  (error, result) => {
                 console.log(`${this.firstAirline} Funded: ${result}`);

             });

            */
            callback();
        });
    }

  

    isOperational(callback) {
       let self = this;
       self.flightSuretyApp.methods
            .isOperational()
            .call({ from: self.owner}, callback);
    }

    isAirlineRegistered(address, callback) {
       let self = this;
       self.flightSuretyApp.methods
            .isAirlineRegistered(address)
            .call({ from: self.owner}, callback);
    }


    isAirlineFunded(address, callback) {
       let self = this;

      console.log(`isAirline funded  ${self.firstAirline}`);
    
       self.flightSuretyApp.methods
            .isAirlineFunded(self.firstAirline)
            .call({ from: self.owner}, (error, result) => {
               // console.log(`${error}, ${result}`);
                callback(error, result);
            });
    }

    authorizeContract(callback) {
        let self = this;
        console.log(`${self.config.appAddress}, ${self.owner}`);
    
        self.flightSuretyData.methods
            .authorizeContract(self.config.appAddress)
            .send({ from: self.owner}, (error, result) => {
                callback(error, result);
            });
    }

    
    fundAirline(callback) {
       let self = this;
       let fundAmount= web3.toWei(10, "ether");

       console.log(`funding airline ${self.firstAirline} ${fundAmount}`);
  
       self.flightSuretyApp.methods
            .fund()
            .send({ from: self.firstAirline, value: fundAmount}, (error, result) => {
                console.log(`${error}`);
                callback(error, result);
            });
    }



    registerFlight(flight, callback) {
        let self = this;
        
        console.log(`registerFlight ${flight.flightNumber} ${flight.flightTimestamp}  ${self.firstAirline}`);
        self.flightSuretyApp.methods
            .registerFlight(flight.flightNumber, flight.flightTimestamp)
            .send({ from: self.firstAirline}, (error, result) => {
                console.log(`registeriFlight ${error}, ${result}`);
                callback(error, result);
            });
    }

    getFlightInfo(flight, callback) {
       let self = this;

      console.log(`getFlightInfo ${flight.flightNumber}, ${flight.flightTimestamp}`);
    
    
       self.flightSuretyApp.methods
            .getFlightInfo(flight.flightNumber, flight.flightTimestamp)
            .call({ from: self.firstAirline}, (error, result) => {
                console.log(`getFlightInfo ${error}, ${result}`);
            });
            
            
    }

    buyInsurance(index, amount, callback) {
        let self = this;
        let insuranceAmount= web3.toWei(amount, "ether");

     console.log(`buyInsurance ${self.firstAirline} ${self.flights[index].flightNumber}, ${self.flights[index].flightTimestamp} ${self.passengers[self.passengerIndex]} ${insuranceAmount}`);
     
     self.flightSuretyData.methods
            .buy(self.firstAirline, self.flights[index].flightNumber, self.flights[index].flightTimestamp)
            .send({ from: self.passengers[self.passengerIndex], value: insuranceAmount}, (error, result) => {
                console.log(`buyInsurance ${error}, ${result}`);
                callback(error, result);

         });
    }



    fetchPurchasedInsurance(index, callback) {
       let self = this;
 
      console.log(`fetchPurchasedInsurance ${self.flights[index].flightNumber}, ${self.flights[index].flightTimestamp} ${self.passengers[self.passengerIndex]}`);
       self.flightSuretyData.methods
            .fetchPurchasedInsuranceAmount(self.firstAirline, self.flights[index].flightNumber, self.flights[index].flightTimestamp, self.passengers[self.passengerIndex])
            .call({ from: self.firstAirline}, (error, result) => {
                console.log(`fetchPurchasedInsurance result ${error}, ${result}`);
                callback(error, result);
    });
            
            
    }

    fetchCreditBalance(index, callback) {
       let self = this;
 
      console.log(`checkCredit ${self.passengers[self.passengerIndex]}`);
       self.flightSuretyApp.methods
            .checkCredit()
            .call({ from: self.passengers[self.passengerIndex]}, (error, result) => {
                console.log(`checkCredit result ${error}, ${result}`);
                callback(error, result);
        });
            
            
    }

    withdrawCredit(callback) {
        let self = this;
        
        console.log(`withdrawCredit ${self.passengers[self.passengerIndex]}`);
     
        self.flightSuretyApp.methods
            .withdrawCredit()
            .send({ from: self.passengers[self.passengerIndex]}, (error, result) => {
                console.log(`withdrawCredit ${error}, ${result}`);
                callback(error, result);

         });
    }


    fetchFlightStatus(index, callback) {
        let self = this;

        console.log(`fetchFlightStatus ${self.firstAirline} ${self.flights[index].flightNumber}, ${self.flights[index].flightTimestamp} ${self.passengers[self.passengerIndex]}`);
    
        
        self.flightSuretyApp.methods
            .fetchFlightStatus(self.firstAirline, self.flights[index].flightNumber, self.flights[index].flightTimestamp)
            .send({ from: self.owner}, (error, result) => {
                callback(error, result);
            });
    }


    fetchContractOwner(callback) {
       let self = this;
       self.flightSuretyData.methods
            .fetchContractOwner()
            .call({ from: self.owner}, (error, result) => {
                callback(error, result);
            });
    }



    fetchAuthorizedContract(callback) {
       let self = this;
       self.flightSuretyApp.methods
            .fetchAuthorizedContract(self.config.appAddress)
            .call({ from: self.owner}, (error, result) => {
                console.log(`${error}, ${result}`);
                callback(error, result);
            });
    }

    getFundingParty(callback) {
       let self = this;

       self.flightSuretyApp.methods
            .getFundingParty()
            .call({ from: self.owner}, (error, result) => {
                console.log(`${error}, ${result}`);
            });
    }


    fetchAirline(callback) {
       let self = this;

      console.log(`fetchAirline ${self.firstAirline}`);
    
       self.flightSuretyData.methods
            .fetchAirline(self.firstAirline)
            .call({ from: self.owner}, (error, result) => {
                //console.log(`${error}, ${result[0]}, ${result[1]},${result[2]},${result[3]}`);
                callback(error, result);
            });
    }
     


}