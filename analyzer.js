document.addEventListener('DOMContentLoaded', () => {
    // --- Logic for tools.html (Appliance Analyzer) ---
    const applianceForm = document.getElementById('applianceForm');
    
    // Check if we are on the tools page by seeing if the analyzer form exists
    if (applianceForm) {
        const applianceList = document.getElementById('applianceList');
        const calculateTotalBtn = document.getElementById('calculateTotalBtn');
        const totalEnergySpan = document.getElementById('totalEnergy');
        const totalCostSpan = document.getElementById('totalCost');
        const totalCO2Span = document.getElementById('totalCO2');
        const kwhCostInput = document.getElementById('kwhCost');
        const co2PerKwhInput = document.getElementById('co2PerKwh');

        // --- Load appliances from localStorage ---
        let appliances = JSON.parse(localStorage.getItem('verdeViewAppliances')) || [];

        // --- Function to save appliances to localStorage ---
        function saveAppliances() {
            localStorage.setItem('verdeViewAppliances', JSON.stringify(appliances));
        }

        // Function to render appliances in the list
        function renderAppliances() {
            applianceList.innerHTML = ''; // Clear current list
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

            // Add event listeners to new remove buttons
            document.querySelectorAll('.remove-appliance-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    const index = parseInt(e.target.dataset.index);
                    appliances.splice(index, 1); // Remove from array
                    renderAppliances(); // Re-render the list
                    calculateTotal(); // Recalculate totals
                });
            });
            
            // --- Save to localStorage after any render ---
            saveAppliances();
        }

        // Function to calculate total energy, cost, and CO2
        function calculateTotal() {
            let totalAnnualEnergyKWh = 0;
            const electricityCostPerKwh = parseFloat(kwhCostInput.value) || 0;
            const co2EmissionsPerKwh = parseFloat(co2PerKwhInput.value) || 0;

            appliances.forEach(app => {
                const dailyEnergyWh = app.wattage * app.hoursPerDay;
                const weeklyEnergyWh = dailyEnergyWh * app.daysPerWeek;
                const annualEnergyWh = weeklyEnergyWh * 52; // Use 52 weeks for a year
                totalAnnualEnergyKWh += annualEnergyWh / 1000; // Convert Wh to kWh
            });

            const totalAnnualCost = totalAnnualEnergyKWh * electricityCostPerKwh;
            const totalAnnualCO2 = totalAnnualEnergyKWh * co2EmissionsPerKwh;

            totalEnergySpan.textContent = `${totalAnnualEnergyKWh.toFixed(2)} kWh`;
            totalCostSpan.textContent = `$${totalAnnualCost.toFixed(2)}`;
            totalCO2Span.textContent = `${totalAnnualCO2.toFixed(2)} kg`;
        }

        // Add Appliance Form Submission
        applianceForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('applianceName').value;
            const wattage = parseFloat(document.getElementById('wattage').value);
            const hoursPerDay = parseFloat(document.getElementById('hoursPerDay').value);
            const daysPerWeek = parseFloat(document.getElementById('daysPerWeek').value);

            if (name && !isNaN(wattage) && !isNaN(hoursPerDay) && !isNaN(daysPerWeek) && wattage > 0 && hoursPerDay >= 0 && daysPerWeek >= 0) {
                appliances.push({ name, wattage, hoursPerDay, daysPerWeek });
                renderAppliances();
                calculateTotal();
                applianceForm.reset(); // Clear form fields
            } else {
                console.warn('Invalid appliance data entered.');
            }
        });

        // Recalculate on 'Calculate Total' button click
        // This is now safe because the button is type="button"
        calculateTotalBtn.addEventListener('click', calculateTotal);

        // Recalculate when cost/CO2 inputs change
        kwhCostInput.addEventListener('input', calculateTotal);
        co2PerKwhInput.addEventListener('input', calculateTotal);

        // Initial render and calculation (load from localStorage)
        renderAppliances();
        calculateTotal();

        // Smooth scrolling for nav links (if any)
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                if (this.hash !== "") {
                    // Check if the link is for an element on the tools page
                    const targetElement = document.querySelector(this.hash);
                    if (targetElement) { // Simplified check for tools page
                        e.preventDefault();
                        targetElement.scrollIntoView({
                            behavior: 'smooth'
                        });
                    }
                }
            });
        });
    }
});