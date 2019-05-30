pragma solidity ^0.4.25;

// It's important to avoid vulnerabilities due to numeric overflow bugs
// OpenZeppelin's SafeMath library, when used correctly, protects agains such bugs
// More info: https://www.nccgroup.trust/us/about-us/newsroom-and-events/blog/2018/november/smart-contract-insecurity-bad-arithmetic/

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

/************************************************** */
/* FlightSurety Smart Contract                      */
/************************************************** */
contract FlightSuretyApp {
    using SafeMath for uint256; // Allow SafeMath functions to be called for all uint256 types (similar to "prototype" in Javascript)
    uint private insuranceAmount;
    address private insuranceBuyer;
    bool test = true;

    event PassengerWithdrawCredit(address owner, uint credit);

   /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    FlightSuretyData flightSuretyData;

    // Flight status codees
    uint8 private constant STATUS_CODE_UNKNOWN = 0;
    uint8 private constant STATUS_CODE_ON_TIME = 10;
    uint8 private constant STATUS_CODE_LATE_AIRLINE = 20;
    uint8 private constant STATUS_CODE_LATE_WEATHER = 30;
    uint8 private constant STATUS_CODE_LATE_TECHNICAL = 40;
    uint8 private constant STATUS_CODE_LATE_OTHER = 50;

    address private contractOwner;          // Account used to deploy contract

    struct Flight {
        bool isRegistered;
        uint8 statusCode;
        uint256 updatedTimestamp;        
    }
    mapping(bytes32 => Flight) private flights;
    
 
    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
    * @dev Modifier that requires the "operational" boolean variable to be "true"
    *      This is used on all state changing functions to pause the contract in 
    *      the event there is an issue that needs to be fixed
    */
    modifier requireIsOperational() 
    {
         // Modify to call data contract's status
        require(flightSuretyData.isOperational()==true, "Contract is currently not operational");  
        _;  // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
    * @dev Modifier that requires the "ContractOwner" account to be the function caller
    */
    modifier requireContractOwner()
    {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }


    

    modifier requireAirlineRegistered() 
    {
        require(flightSuretyData.isAirlineRegistered(msg.sender) == true, "Airline is not registered yet.");
        _;

    }

    modifier requireAirlineFunded() 
    {
        require(flightSuretyData.isAirlineFunded(msg.sender) == true, "Airline is not funded yet.");
        _;

    }

    /********************************************************************************************/
    /*                                       CONSTRUCTOR                                        */
    /********************************************************************************************/

    /**
    * @dev Contract constructor
    *
    */
    constructor (address _dataContract) public 
    {
        contractOwner = msg.sender;
        flightSuretyData =  FlightSuretyData(_dataContract);
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    function isOperational()  public view returns(bool) 
    {
        return flightSuretyData.isOperational();  // Modify to call data contract's status
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

  
   /**
    * @dev Add an airline to the registration queue
    *
    */   
    function registerAirline (address newAirline, string name ) external requireIsOperational
    {
        flightSuretyData.registerAirline(newAirline, name, msg.sender);
      
    }


    function castVoteForNewAirline (address newAirline) external requireIsOperational
    {
        flightSuretyData.castVoteForNewAirline(newAirline,  msg.sender);
      
    }


    function isAirlineRegistered(address airline) public view returns (bool)
    {
        return flightSuretyData.isAirlineRegistered(airline);
    }

    function isAirlineFunded(address airline) public view returns (bool)
    {
        return flightSuretyData.isAirlineFunded(airline);
    }


    function fetchAuthorizedContract(address _address) external returns(bool){
        return flightSuretyData.fetchAuthorizedContract(_address);
    }

    function fund() public payable requireAirlineRegistered {
        require(msg.value >= 10 ether, "Payment is not 10 ether or higher");
        flightSuretyData.fund(msg.sender);
    }


   /**
    * @dev Register a future flight for insuring.
    *
    */  
    function registerFlight(string memory flight, uint256 timestamp)  public requireAirlineRegistered requireAirlineFunded requireIsOperational
    {   
        
        bytes32 _flightID = getFlightKey(msg.sender, flight, timestamp);
        
        
        flights[_flightID].statusCode = STATUS_CODE_UNKNOWN;
        flights[_flightID].isRegistered = true; 
        flights[_flightID].updatedTimestamp = timestamp; 
        

    }

    function getFlightInfo(string memory flight,  uint256 timestamp)  public view returns(
        bool 
    )
    {
        bytes32 _flightID = getFlightKey(msg.sender, flight, timestamp);

        return  flights[_flightID].isRegistered;

    }


    
   /**
    * @dev Called after oracle has updated flight status
    *
    */  
    function processFlightStatus
                                (
                                    address airline,
                                    string memory flight,
                                    uint256 timestamp,
                                    uint8 statusCode
                                )
                                internal
                             
    {

        bytes32 _flightID = getFlightKey(airline, flight, timestamp);
        flights[_flightID].statusCode = statusCode;
        flights[_flightID].updatedTimestamp = timestamp;
 
        if(statusCode == STATUS_CODE_LATE_AIRLINE) {
            flightSuretyData.creditInsurees(airline, flight, timestamp);
        }

    }


    // Generate a request for oracles to fetch flight information
    function fetchFlightStatus
                        (
                            address airline,
                            string flight,
                            uint256 timestamp                            
                        )
                        external
    {
        uint8 index = getRandomIndex(msg.sender);

        // Generate a unique key for storing the request
        bytes32 key = keccak256(abi.encodePacked(index, airline, flight, timestamp));
        oracleResponses[key] = ResponseInfo({
                                                requester: msg.sender,
                                                isOpen: true
                                            });

        emit OracleRequest(index, airline, flight, timestamp);
    } 


    function viewFlightStatus
    (   address airline,
        string flight,
        uint256 timestamp                            
     ) external view returns(uint8)
    {
        bytes32 _flightID = getFlightKey(airline, flight, timestamp);
        return flights[_flightID].statusCode;
       
    } 


// region ORACLE MANAGEMENT

    // Incremented to add pseudo-randomness at various points
    uint8 private nonce = 0;    

    // Fee to be paid when registering oracle
    uint256 public constant REGISTRATION_FEE = 1 ether;

    // Number of oracles that must respond for valid status
    uint256 private constant MIN_RESPONSES = 3;


    struct Oracle {
        bool isRegistered;
        uint8[3] indexes;        
    }

    // Track all registered oracles
    mapping(address => Oracle) private oracles;

    // Model for responses from oracles
    struct ResponseInfo {
        address requester;                              // Account that requested status
        bool isOpen;                                    // If open, oracle responses are accepted
        mapping(uint8 => address[]) responses;          // Mapping key is the status code reported
                                                        // This lets us group responses and identify
                                                        // the response that majority of the oracles
    }

    // Track all oracle responses
    // Key = hash(index, flight, timestamp)
    mapping(bytes32 => ResponseInfo) private oracleResponses;

    // Event fired each time an oracle submits a response
    event FlightStatusInfo(address airline, string flight, uint256 timestamp, uint8 status);

    event OracleReport(address airline, string flight, uint256 timestamp, uint8 status);

    // Event fired when flight status request is submitted
    // Oracles track this and if they have a matching index
    // they fetch data and submit a response
    event OracleRequest(uint8 index, address airline, string flight, uint256 timestamp);


    // Register an oracle with the contract
    function registerOracle () external payable
    {
        // Require registration fee
        require(msg.value >= REGISTRATION_FEE, "Registration fee is required");

        uint8[3] memory indexes = generateIndexes(msg.sender);

        oracles[msg.sender] = Oracle({isRegistered: true,
                                     indexes: indexes
                                    });
    }

    function getMyIndexes
                            (
                            )
                            view
                            external
                            returns(uint8[3])
    {
        require(oracles[msg.sender].isRegistered, "Not registered as an oracle");

        return oracles[msg.sender].indexes;
    }

/*

  function buyInsurance(address airline, string flight, uint256 timestamp) public payable requireIsOperational {
        bytes32 _flightID = getFlightKey(airline, flight, timestamp);
        require(flights[_flightID].isRegistered, "Flight does not exist.");
        require(msg.value > 0 , "Insurance purchase amount needs to be greater than 0.");
        require(msg.value <= 1 ether, "You can only insure up to 1 ETH of value.");
        flightSuretyData.buy(airline, flight,  timestamp, msg.value, msg.sender);
    }

    */

    

    function checkCredit() view public requireIsOperational returns (uint) {
        return flightSuretyData.checkCredit(msg.sender);
    }
    
    function withdrawCredit() public requireIsOperational {
        
        uint totalCredit = flightSuretyData.checkCredit(msg.sender);
        require(totalCredit > 0, "Credit Balance is below zero.");
        
        flightSuretyData.pay(msg.sender);

        emit PassengerWithdrawCredit(msg.sender, totalCredit);
        msg.sender.transfer(totalCredit);
        
    }


    // Called by oracle when a response is available to an outstanding request
    // For the response to be accepted, there must be a pending request that is open
    // and matches one of the three Indexes randomly assigned to the oracle at the
    // time of registration (i.e. uninvited oracles are not welcome)
    function submitOracleResponse
                        (
                            uint8 index,
                            address airline,
                            string flight,
                            uint256 timestamp,
                            uint8 statusCode
                        )
                        external
    {
        require((oracles[msg.sender].indexes[0] == index) || (oracles[msg.sender].indexes[1] == index) || (oracles[msg.sender].indexes[2] == index), "Index does not match oracle request");


        bytes32 key = keccak256(abi.encodePacked(index, airline, flight, timestamp)); 
        require(oracleResponses[key].isOpen, "Flight or timestamp do not match oracle request");

        oracleResponses[key].responses[statusCode].push(msg.sender);

        // Information isn't considered verified until at least MIN_RESPONSES
        // oracles respond with the *** same *** information
        emit OracleReport(airline, flight, timestamp, statusCode);
        
        
        if (oracleResponses[key].responses[statusCode].length >= MIN_RESPONSES) {

            oracleResponses[key].isOpen = false;
            
            emit FlightStatusInfo(airline, flight, timestamp, statusCode);


            // Handle flight status as appropriate
            processFlightStatus(airline, flight, timestamp, statusCode);
        }
    }


    function getFlightKey
                        (
                            address airline,
                            string flight,
                            uint256 timestamp
                        )
                        
                        public view
                        returns(bytes32) 
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }



    // Returns array of three non-duplicating integers from 0-9
    function generateIndexes
                            (                       
                                address account         
                            )
                            internal
                            returns(uint8[3])
    {
        uint8[3] memory indexes;
        indexes[0] = getRandomIndex(account);
        
        indexes[1] = indexes[0];
        while(indexes[1] == indexes[0]) {
            indexes[1] = getRandomIndex(account);
        }

        indexes[2] = indexes[1];
        while((indexes[2] == indexes[0]) || (indexes[2] == indexes[1])) {
            indexes[2] = getRandomIndex(account);
        }

        return indexes;
    }

    // Returns array of three non-duplicating integers from 0-9
    function getRandomIndex
                            (
                                address account
                            )
                            internal
                            returns (uint8)
    {
        uint8 maxValue = 10;

        // Pseudo random number...the incrementing nonce adds variation
        uint8 random = uint8(uint256(keccak256(abi.encodePacked(blockhash(block.number - nonce++), account))) % maxValue);

        if (nonce > 250) {
            nonce = 0;  // Can only fetch blockhashes for last 256 blocks so we adapt
        }

        return random;
    }

// endregion

}   


contract FlightSuretyData {
    function registerAirline (address, string, address) external;
    function isAirlineRegistered(address airline) external returns (bool);
    function isOperational()  public  returns(bool);
    function fund(address) public ;
    function isAirlineFunded(address ) external returns (bool);
    function castVoteForNewAirline (address, address) external;
    function creditInsurees(address, string, uint256) external;
    function buy (address, string, uint256, uint , address)  external;
    function pay  (address ) external ; 
    function checkCredit(address) external returns(uint);
    function fetchAuthorizedContract(address) public returns (bool);
 
}
