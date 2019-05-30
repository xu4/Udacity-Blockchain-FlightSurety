pragma solidity ^0.4.25;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

   
    event creditInsuree(uint payout, uint balance);
    event buyInsurance(uint insuranceAmount,uint origValue, address buyer);
    event withdrawCredit(address owner, uint credit);

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    address private contractOwner;      // Account used to deploy contract
    bool private operational = true;    // Blocks all state changes throughout the contract if false

    bool private testingMode = true;

    struct Airline {
        string name;
        bool registered;
        bool funded;
    }
    
    mapping (address => Airline) airlines;
    address[] public airlineArray;

    mapping (address => bool) authorizedContracts;
    mapping (address => address[]) airlinesRegistration;
    
    
    struct Passenger {
        // Mapping a flight to the insurance amount
        mapping(bytes32 => uint) flightsInsurance;
        uint creditBalance;
    }
    

    //accounts mapping to passenger objects
    mapping (address => Passenger) passengers;
    
    //Mapping a flight Key to passengers' accounts address
    mapping (bytes32 => address[]) insurees;




    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/


    /**
    * @dev Constructor
    *      The deploying account becomes contractOwner
    */
    constructor(address airline, string _name)  public 
    {
        contractOwner = msg.sender;
        airlines[airline].name = _name;
        airlines[airline].registered = true;
        airlines[airline].funded = false;
        airlineArray.push(airline);
        //first airline register itself.
        airlinesRegistration[airline].push(airline);

    }

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
        require(operational, "Contract is currently not operational");
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


    modifier requireAuthorizedContract() {
        require(authorizedContracts[msg.sender] == true, "This calling contract is not authorized.");
        _;
    }

   


    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
    * @dev Get operating status of contract
    *
    * @return A bool that is the current operating status
    */      
    function isOperational() 
                            public 
                            view 
                            returns(bool) 
    {
        return operational;
    }



    /**
    * @dev set testing mode 
    *
    */      
    function setTestingMode(bool mode) external requireIsOperational
    {
        testingMode = mode;
    }


    /**
    * @dev Sets contract operations on/off
    *
    * When operational mode is disabled, all write transactions except for this one will fail
    */    
    function setOperatingStatus
                            (
                                bool mode
                            ) 
                            external
                            requireContractOwner 
    {
        operational = mode;
    }

    
    function authorizeContract(address _address) public requireContractOwner requireIsOperational
    {
        authorizedContracts[_address] = true;
    }

    function deauthorizeContract(address _address) public requireContractOwner requireIsOperational 
    {
        authorizedContracts[_address] = false;
    }


    function isAuthorizedContract(address _address) public view returns (bool) {
        return authorizedContracts[_address];

    }

    function alreadyCalled(address _toRegister, address _caller) view public returns (bool) {
        for (uint i = 0; i < airlinesRegistration[_toRegister].length; i++) {
            if(airlinesRegistration[_toRegister][i] == _caller) {
                return true;
            }
        }
        return false;
    }
    
    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

    function isAirlineRegistered(address airline) external view returns (bool)
    {
        return airlines[airline].registered;
    }

    function isAirlineFunded(address _address) view public returns (bool) {
        return airlines[_address].funded;
    }

    function fetchAirline(address airline) public view returns 
  (     address    airlineAddress,
        string    name,
        bool    registered,
        bool  funded
    ) 
  {
    
    return 
    (   airline,
        airlines[airline].name,
        airlines[airline].registered,
        airlines[airline].funded
     );
  }


function fetchAuthorizedContract(address _address) public view returns (bool)
  {
    
    if(authorizedContracts[_address] == true){
        return true;
    }else{
        return false;
    }
     
  }


function fetchContractOwner() public view returns (address)
  {
    
  return contractOwner;
     
  }


function fetchNumberOfAirline() public view returns (uint256)
  {

    return airlineArray.length;
     
  }


    function fetchVotes(address airline) public view returns (uint256)
    {

    return airlinesRegistration[airline].length;
     
  }

   /**
    * @dev Add an airline to the registration queue
    *      Can only be called from FlightSuretyApp contract
    *
    */   
    function registerAirline (address airline, string _name, address _caller) 
    requireAuthorizedContract 
    external
    {
        require(this.isAirlineRegistered(airline) == false, "This airline is already registered.");

        require(this.isAirlineFunded(_caller) == true, "Airline is not funded yet.");

        //check the caller is funded, eligibel to register others.

        //require(this.alreadyCalled(airline, _caller) == false, "This airline already send a request to register by the same airline.");

        //airlinesRegistration[airline].push(_caller);
        if(airlineArray.length > 3 && airlinesRegistration[airline].length < airlineArray.length.div(2))
        {
            //more than 4 airlines registered and votes is less than half. registration is not allowed yet.

        }else{
            
            airlines[airline].name = _name;
            airlines[airline].registered = true;
            airlines[airline].funded = false;
            airlineArray.push(airline);
        }
   }



   /**
    * @dev Cast vote to approve new airline 
    *      Can only be called from FlightSuretyApp contract
    *
    */   
    function castVoteForNewAirline (address airline, address _caller) external requireAuthorizedContract
    {
        require(this.isAirlineRegistered(airline) == false, "This airline is already registered.");

        require(this.isAirlineFunded(_caller) == true, "Airline is not funded yet.");

        if(this.alreadyCalled(airline, _caller) == false){
            airlinesRegistration[airline].push(_caller);
        }

    }



   /**
    * @dev Buy insurance for a flight
    *
    */

    function buy (address airline, string flight , uint256 timestamp)  public payable requireIsOperational 
    {
        
        bytes32 _flightID = getFlightKey(airline, flight, timestamp);

        require(msg.value <= 1 ether, "You can only insure up to 1 ETH of value.");
        require(msg.value > 0 , "Insurance purchase amount needs to be greater than 0.");
 

        insurees[_flightID].push(msg.sender);
        
        passengers[msg.sender].flightsInsurance[_flightID] = msg.value;

        emit buyInsurance(passengers[msg.sender].flightsInsurance[_flightID], msg.value, msg.sender);

   }

  
   function fetchPurchasedInsuranceAmount(address airline, string flight , uint256 timestamp,  address buyer) public view returns (uint)
  {
    bytes32 _flightID = getFlightKey(airline, flight, timestamp);

    return passengers[buyer].flightsInsurance[_flightID];
     
  }


    /**
     *  @dev Credits payouts to insurees
    */
    function creditInsurees (address airline, string flight,uint256 timestamp) external requireAuthorizedContract requireIsOperational {

        bytes32 _flightID = getFlightKey(airline, flight, timestamp);

        for(uint i = 0; i < insurees[_flightID].length; i++) {
            address pAddress = insurees[_flightID][i];
            uint payout = passengers[pAddress].flightsInsurance[_flightID].mul(3).div(2);
            passengers[pAddress].flightsInsurance[_flightID] = 0;
            passengers[pAddress].creditBalance += payout;

            emit creditInsuree(payout, passengers[pAddress].creditBalance);
        }
        delete insurees[_flightID];
    }


    

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
    */
    function pay (address _address) external requireAuthorizedContract requireIsOperational 
    {
        uint credit = passengers[_address].creditBalance;
        emit withdrawCredit(_address, credit);
        passengers[_address].creditBalance = 0;
  
    }

    function checkCredit(address _address) external view returns (uint)
  {

    return passengers[_address].creditBalance;
     
  }

   /**
    * @dev Initial funding for the insurance. Unless there are too many delayed flights
    *      resulting in insurance payouts, the contract should be self-sustaining
    *
    */   

    function fund(address _address) public requireAuthorizedContract {
        airlines[_address].funded = true;
    }


    function getFlightKey
                        (
                            address airline,
                            string memory flight,
                            uint256 timestamp
                        )
                        pure
                        internal
                        returns(bytes32) 
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    /**
    * @dev Fallback function for funding smart contract.
    *
    */
    function() 
                            external 
                            payable 
    {
        fund(msg.sender);
    }


}

