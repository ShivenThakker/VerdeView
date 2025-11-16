document.addEventListener('DOMContentLoaded', () => {
    
    // --- DATABASE for efficient alternatives (India-specific) ---
    const efficientAlternatives = {
        'refrigerator': { 
            name: 'LG 242L 5-Star Fridge', 
            wattage: 55, // Estimated average wattage
            searchLink: 'https://www.amazon.in/s?k=BEE+5+star+refrigerator' 
        },
        'lightbulb': { 
            name: 'Wipro 9W LED Bulb', 
            wattage: 9,
            searchLink: 'https://www.amazon.in/s?k=9w+led+bulb'
        },
        'ac': { 
            name: 'LG 1.5 Ton 5-Star AC', 
            wattage: 1450, // Wattage for 1.5 Ton 5-Star Inverter
            searchLink: 'https://www.amazon.in/s?k=1.5+ton+5+star+inverter+ac'
        },
        'tv': { 
            name: 'Samsung 43" LED TV', 
            wattage: 60,
            searchLink: 'https://www.amazon.in/s?k=43+inch+led+tv'
        },
        'washer': { 
            name: 'IFB 8kg 5-Star Front Load', 
            wattage: 600, // Estimated avg wattage per hour-long cycle
            searchLink: 'https://www.amazon.in/s?k=5+star+front+load+washing+machine'
        },
        'dryer': { 
            name: 'Bosch Heat Pump Dryer', 
            wattage: 1000, // Heat pump dryers are more efficient
            searchLink: 'https://www.amazon.in/s?k=heat+pump+dryer+india'
        }
    };

    // --- HELPER FUNCTIONS ---
    
    /**
     * Calculates annual kWh based on usage.
     * @param {number} wattage - Appliance wattage in W
     * @param {number} hoursPerDay - Hours used per day
     * @param {number} daysPerWeek - Days used per week
     * @returns {number} - Annual energy consumption in kWh
     */
    function calculateAnnualKWh(wattage, hoursPerDay, daysPerWeek) {
        const dailyEnergyWh = wattage * hoursPerDay;
        const weeklyEnergyWh = dailyEnergyWh * daysPerWeek;
        const annualEnergyWh = weeklyEnergyWh * 52; // 52 weeks in a year
        return annualEnergyWh / 1000; // Convert Wh to kWh
    }

    /**
     * Gets the current electricity cost from the input field.
     * @returns {number}
     */
    function getKwhCost() {
        return parseFloat(document.getElementById('kwhCost').value) || 0;
    }

    /**
     * Gets the current carbon intensity from the input field.
     * @returns {number}
     */
    function getCo2PerKwh() {
        return parseFloat(document.getElementById('co2PerKwh').value) || 0;
    }

    // --- LOGIC 1: MAIN APPLIANCE LIST CALCULATOR ---
    const applianceForm = document.getElementById('applianceForm');
    
    if (applianceForm) {
        const applianceList = document.getElementById('applianceList');
        const calculateTotalBtn = document.getElementById('calculateTotalBtn');
        const totalEnergySpan = document.getElementById('totalEnergy');
        const totalCostSpan = document.getElementById('totalCost');
        const totalCO2Span = document.getElementById('totalCO2');
        const kwhCostInput = document.getElementById('kwhCost');
        const co2PerKwhInput = document.getElementById('co2PerKwh');

        let appliances = JSON.parse(localStorage.getItem('verdeViewAppliances')) || [];

        function saveAppliances() {
            localStorage.setItem('verdeViewAppliances', JSON.stringify(appliances));
        }

        function renderAppliances() {
            applianceList.innerHTML = '';
            if (appliances.length === 0) {
                applianceList.innerHTML = '<li class="p-3 text-gray-500 text-center">No appliances added yet.</li>';
                return;
            }
            appliances.forEach((app, index) => {
                const listItem = document.createElement('li');
                listItem.className = 'flex justify-between items-center p-3 hover:bg-gray-50';
                listItem.innerHTML = `
                    <div>
                        <p class="text-base font-medium text-gray-900">${app.name}</p>
                        <p class="text-sm text-gray-500">${app.wattage}W, ${app.hoursPerDay}h/day, ${app.daysPerWeek} days/week</p>
                    </div>
                    <button data-index="${index}" class="remove-appliance-btn text-red-600 hover:text-red-800 text-sm font-medium">Remove</button>
                `;
                applianceList.appendChild(listItem);
            });

            document.querySelectorAll('.remove-appliance-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    const index = parseInt(e.target.dataset.index);
                    appliances.splice(index, 1);
                    renderAppliances();
                    calculateTotalSummary();
                });
            });
            
            saveAppliances();
        }

        /**
         * Calculates the total summary for all appliances in the list.
         */
        function calculateTotalSummary() {
            let totalAnnualEnergyKWh = 0;
            const electricityCostPerKwh = getKwhCost();
            const co2EmissionsPerKwh = getCo2PerKwh();

            appliances.forEach(app => {
                totalAnnualEnergyKWh += calculateAnnualKWh(app.wattage, app.hoursPerDay, app.daysPerWeek);
            });

            const totalAnnualCost = totalAnnualEnergyKWh * electricityCostPerKwh;
            const totalAnnualCO2 = totalAnnualEnergyKWh * co2EmissionsPerKwh;

            totalEnergySpan.textContent = `${totalAnnualEnergyKWh.toFixed(2)} kWh`;
            totalCostSpan.textContent = `₹${totalAnnualCost.toFixed(2)}`; // Updated currency
            totalCO2Span.textContent = `${totalAnnualCO2.toFixed(2)} kg`;
        }

        applianceForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('applianceName').value;
            const wattage = parseFloat(document.getElementById('wattage').value);
            const hoursPerDay = parseFloat(document.getElementById('hoursPerDay').value);
            const daysPerWeek = parseFloat(document.getElementById('daysPerWeek').value);

            if (name && !isNaN(wattage) && !isNaN(hoursPerDay) && !isNaN(daysPerWeek) && wattage > 0 && hoursPerDay >= 0 && daysPerWeek >= 0) {
                appliances.push({ name, wattage, hoursPerDay, daysPerWeek });
                renderAppliances();
                calculateTotalSummary();
                applianceForm.reset();
            } else {
                console.warn('Invalid appliance data entered.');
            }
        });

        calculateTotalBtn.addEventListener('click', calculateTotalSummary);
        kwhCostInput.addEventListener('input', calculateTotalSummary);
        co2PerKwhInput.addEventListener('input', calculateTotalSummary);

        // Initial load
        renderAppliances();
        calculateTotalSummary();
    }

    // --- LOGIC 2: SAVINGS FINDER TOOL ---
    const finderForm = document.getElementById('finderForm');
    
    if (finderForm) {
        const placeholder = document.getElementById('finderPlaceholder');
        const resultsContent = document.getElementById('comparisonContent');
        const errorContent = document.getElementById('finderError');
        const applianceTypeDropdown = document.getElementById('applianceType');

        // Get labels and inputs for dynamic update
        const hoursLabel = document.getElementById('finderHoursLabel'); // Updated to use ID
        const daysLabel = document.getElementById('finderDaysLabel'); // Updated to use ID
        const hoursInput = document.getElementById('finderHoursPerDay');
        const daysInput = document.getElementById('finderDaysPerWeek');

        // Listen for changes on the dropdown
        applianceTypeDropdown.addEventListener('change', (e) => {
            const type = e.target.value;
            if (type === 'washer' || type === 'dryer') {
                hoursLabel.textContent = "Hours Per Load";
                daysLabel.textContent = "Loads Per Week";
                hoursInput.placeholder = "e.g., 1.5";
                daysInput.placeholder = "e.g., 4";
            } else {
                hoursLabel.textContent = "Hours Used Per Day";
                daysLabel.textContent = "Days Used Per Week";
                hoursInput.placeholder = "e.g., 8";
                daysInput.placeholder = "e.g., 7";
            }
        });

        finderForm.addEventListener('submit', (e) => {
            e.preventDefault();

            // Get inputs
            const type = applianceTypeDropdown.value;
            const wattage = parseFloat(document.getElementById('finderWattage').value);
            const hours = parseFloat(hoursInput.value);
            const days = parseFloat(daysInput.value);

            // Get comparison values
            const kwhCost = getKwhCost();
            const co2PerKwh = getCo2PerKwh();
            const efficient = efficientAlternatives[type];

            // Hide all results first
            placeholder.style.display = 'none'; // <-- THIS IS THE FIX
            resultsContent.classList.add('hidden');
            errorContent.classList.add('hidden');

            // Check if we have data and valid inputs
            if (!efficient || isNaN(wattage) || isNaN(hours) || isNaN(days) || wattage <= 0 || hours <= 0 || days <= 0) {
                errorContent.classList.remove('hidden');
                // reset placeholder
                setTimeout(() => {
                    placeholder.style.display = 'block';
                    errorContent.classList.add('hidden');
                }, 3000);
                return;
            }

            // --- Calculations ---
            // Your Appliance
            const yourKWh = calculateAnnualKWh(wattage, hours, days);
            const yourCost = yourKWh * kwhCost;

            // Efficient Appliance
            // Use the *same usage* for a fair comparison
            const efficientKWh = calculateAnnualKWh(efficient.wattage, hours, days);
            const efficientCost = efficientKWh * kwhCost;

            // Savings
            const savedKWh = yourKWh - efficientKWh;
            const savedCost = yourCost - efficientCost;
            const savedCO2 = savedKWh * co2PerKwh;

            // --- DOM Updates ---
            // Your Appliance
            document.getElementById('yourApplianceName').textContent = `${wattage}W ${type.charAt(0).toUpperCase() + type.slice(1)}`;
            document.getElementById('yourAnnualCost').textContent = `₹${yourCost.toFixed(2)} / year`; // Updated currency
            document.getElementById('yourAnnualKWh').textContent = `${yourKWh.toFixed(2)} kWh / year`;

            // Efficient Appliance
            document.getElementById('efficientApplianceName').textContent = efficient.name; // Use new specific name
            document.getElementById('efficientAnnualCost').textContent = `₹${efficientCost.toFixed(2)} / year`; // Updated currency
            document.getElementById('efficientAnnualKWh').textContent = `${efficientKWh.toFixed(2)} kWh / year`;
            
            // New: Update the link
            const linkElement = document.getElementById('efficientLink'); 
            if(linkElement) { // Check if the link element exists
                linkElement.href = efficient.searchLink;
                linkElement.textContent = `Shop for this on Amazon.in →`;
            }

            // Savings
            document.getElementById('savingsCost').textContent = `₹${savedCost.toFixed(2)}`; // Updated currency
            document.getElementById('savingsKWh').innerHTML = `You could save <strong>${savedKWh.toFixed(2)} kWh</strong> and <strong>${savedCO2.toFixed(2)} kg of CO₂</strong> per year.`;

            // Show the results
            resultsContent.classList.remove('hidden');
        });
    }
});