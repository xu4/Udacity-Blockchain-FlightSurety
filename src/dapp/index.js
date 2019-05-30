
import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';


(async() => {

    let result = null;

    let contract = new Contract('localhost', () => {

        // Read transaction
        contract.isOperational((error, result) => {
            console.log(error,result);
            display('Operational Status', 'Check if contract is operational', [ { label: 'Operational Status', error: error, value: result} ]);
        });
    
        DOM.elid('buy-insurance').addEventListener('click', () => {
            let flight_index = DOM.elid('flight-number-buy').value;
            let insuranceAmount = DOM.elid('insurance-amount').value;
        
        
            contract.buyInsurance(flight_index, insuranceAmount, async(error, result) => {
                let valueStr ="Failed";

                if(error == null){
                    valueStr ="successful";
                }
                //contract.fetchPurchasedInsurance(flight_index, (error, result) => {});
                display('Buy Insurance Status', 'Check if insurance for the flight is bought successfully', [ { label: 'status', error: error, value: valueStr} ]);
             });
      
        })

        
        DOM.elid('submit-oracle').addEventListener('click', () => {
            let flight_index = DOM.elid('flight-number-fetch').value;
            
            contract.fetchFlightStatus(flight_index, (error, result) => {
                let valueStr ="Failed";

                if(error == null){
                    valueStr ="successful";
                }
                
                display('Oracles', 'Trigger oracles', [ { label: 'Fetch Flight Status', error: error, value: valueStr} ]);
            });
        })


        DOM.elid('check-insurance').addEventListener('click', () => {
            let flight_index = DOM.elid('flight-number-fetch').value;

            contract.fetchPurchasedInsurance(flight_index, (error, result) => {
                
                display('Insurance Amount', 'Retrieve purchased insurance amount', [ { label: 'Amount', error: error, value: result} ]);
            });
        })

        DOM.elid('check-credit').addEventListener('click', () => {
                let flight_index = DOM.elid('flight-number-fetch').value;

                contract.fetchCreditBalance(flight_index, (error, result) => {
                   
                    display('Credit Balance', 'Retrieve Credit Balance', [ { label: 'Amount', error: error, value: result} ]);
                });
        })

        

        DOM.elid('withdraw-credit').addEventListener('click', () => {
            contract.withdrawCredit( (error, result) => {
                let valueStr ="Failed";

                if(error == null){
                    valueStr ="successful";
                }
                display('Withdraw', 'Withdraw Credits', [ { label: 'Amount', error: error, value: valueStr} ]);
                });
        })

    });
})();


function display(title, description, results) {
    let displayDiv = DOM.elid("display-wrapper");
    let section = DOM.section();
    section.appendChild(DOM.h3(title));
    section.appendChild(DOM.h5(description));
    results.map((result) => {
        let row = section.appendChild(DOM.div({className:'row'}));
        row.appendChild(DOM.div({className: 'col-sm-4 field'}, result.label));
        row.appendChild(DOM.div({className: 'col-sm-8 field-value'}, result.error ? String(result.error) : String(result.value)));
        section.appendChild(row);
    })
    displayDiv.append(section);

}







